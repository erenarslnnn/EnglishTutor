using EnglishTutor.Api.Data;
using EnglishTutor.Api.Dtos;
using EnglishTutor.Api.Models;
using EnglishTutor.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EnglishTutor.Api.Controllers;

[ApiController]
[Route("api")]
public class PublicController(ContentService content, AppDbContext db) : ControllerBase
{
    static bool ValidLang(string? lang) => lang != null && Langs.All.Contains(lang);
    IActionResult BadLang() => BadRequest(new { error = "lang parametresi tr, en veya ru olmalı." });

    /// <summary>Whole page content for one language, in the same shape as content-data.js (used by the site).</summary>
    [HttpGet("content")]
    public async Task<IActionResult> GetContent([FromQuery] string? lang) =>
        !ValidLang(lang) ? BadLang() : Content((await content.BuildLangAsync(lang!, false)).ToJsonString(), "application/json");

    [HttpGet("site-content")]
    public async Task<IActionResult> GetSiteContent([FromQuery] string? lang) =>
        !ValidLang(lang) ? BadLang() : Ok(await content.GetFlatSiteContentAsync(lang!));

    [HttpGet("faq")]
    public async Task<IActionResult> GetFaq([FromQuery] string? lang) =>
        !ValidLang(lang) ? BadLang() : Content((await content.BuildFaqAsync(lang!, false)).ToJsonString(), "application/json");

    [HttpGet("curriculum")]
    public async Task<IActionResult> GetCurriculum([FromQuery] string? lang) =>
        !ValidLang(lang) ? BadLang() : Content((await content.BuildCurriculumObjectAsync(lang!)).ToJsonString(), "application/json");

    [HttpGet("pricing")]
    public async Task<IActionResult> GetPricing([FromQuery] string? lang) =>
        !ValidLang(lang) ? BadLang() : Content((await content.BuildPricingObjectAsync(lang!)).ToJsonString(), "application/json");

    [HttpGet("teacher-profile")]
    public async Task<IActionResult> GetTeacher([FromQuery] string? lang)
    {
        if (!ValidLang(lang)) return BadLang();
        var p = await content.BuildTeacherAsync(lang!);
        return p == null ? NotFound() : Content(p.ToJsonString(), "application/json");
    }

    [HttpPost("contact")]
    [EnableRateLimiting("contact")]
    public async Task<IActionResult> PostContact([FromBody] ContactRequest req)
    {
        db.ContactSubmissions.Add(new ContactSubmission
        {
            StudentName = req.StudentName.Trim(),
            ParentEmail = req.ParentEmail.Trim(),
            ParentPhone = req.ParentPhone.Trim(),
            Topic = req.Topic?.Trim(),
            Message = req.Message?.Trim(),
            SubmittedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
