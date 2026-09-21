using System.Text.Json.Nodes;
using EnglishTutor.Api.Data;
using EnglishTutor.Api.Dtos;
using EnglishTutor.Api.Models;
using EnglishTutor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EnglishTutor.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class AdminController(ContentService content, AppDbContext db) : ControllerBase
{
    /// <summary>Full {en,tr,ru} content, including FAQ entries that are empty in some language.</summary>
    [HttpGet("admin/content")]
    public async Task<IActionResult> GetAll() => Content((await content.BuildAllAsync(true)).ToJsonString(), "application/json");

    /// <summary>Saves the whole content object. All site-wide texts must be present in all three languages.</summary>
    [HttpPut("admin/content")]
    public async Task<IActionResult> PutAll([FromBody] JsonObject body)
    {
        try { await content.ReplaceAllAsync(body); }
        catch (ContentValidationException ex) { return BadRequest(new { error = "Kayıt reddedildi.", errors = ex.Errors }); }
        return Ok(new { ok = true });
    }

    // ---- FAQ CRUD (three languages in one request; each language optional) ----

    [HttpPost("faq")]
    public async Task<IActionResult> CreateFaq([FromBody] FaqUpsertRequest req)
    {
        var err = ValidateFaq(req);
        if (err != null) return BadRequest(new { error = err });
        var order = (await db.FaqItems.MaxAsync(x => (int?)x.DisplayOrder) ?? -1) + 1;
        var item = new FaqItem { DisplayOrder = order };
        Fill(item, req);
        db.FaqItems.Add(item);
        await db.SaveChangesAsync();
        return Ok(new { id = item.Id });
    }

    [HttpPut("faq/{id:int}")]
    public async Task<IActionResult> UpdateFaq(int id, [FromBody] FaqUpsertRequest req)
    {
        var err = ValidateFaq(req);
        if (err != null) return BadRequest(new { error = err });
        var item = await db.FaqItems.Include(x => x.Translations).FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return NotFound();
        db.FaqTranslations.RemoveRange(item.Translations);
        item.Translations.Clear();
        Fill(item, req);
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpDelete("faq/{id:int}")]
    public async Task<IActionResult> DeleteFaq(int id)
    {
        var n = await db.FaqItems.Where(x => x.Id == id).ExecuteDeleteAsync();
        return n == 0 ? NotFound() : NoContent();
    }

    static string? ValidateFaq(FaqUpsertRequest req)
    {
        if (req.Translations.Keys.Any(k => !Langs.All.Contains(k))) return "Geçersiz dil kodu.";
        var any = req.Translations.Values.Any(t => !string.IsNullOrWhiteSpace(t.Question) && !string.IsNullOrWhiteSpace(t.Answer));
        return any ? null : "En az bir dilde hem soru hem cevap dolu olmalı.";
    }

    static void Fill(FaqItem item, FaqUpsertRequest req)
    {
        foreach (var l in Langs.All)
        {
            req.Translations.TryGetValue(l, out var t);
            item.Translations.Add(new FaqTranslation { LanguageCode = l, Question = t?.Question?.Trim() ?? "", Answer = t?.Answer?.Trim() ?? "" });
        }
    }

    // ---- contact form submissions ----

    [HttpGet("contact")]
    public async Task<IActionResult> ListContact() =>
        Ok(await db.ContactSubmissions.OrderByDescending(x => x.SubmittedAt).Take(500).ToListAsync());

    [HttpPut("contact/{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var n = await db.ContactSubmissions.Where(x => x.Id == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.IsRead, true));
        return n == 0 ? NotFound() : NoContent();
    }
}
