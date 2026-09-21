using System.Text.Json;
using System.Text.Json.Nodes;
using EnglishTutor.Api.Data;
using EnglishTutor.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EnglishTutor.Api.Services;

public class ContentValidationException(List<string> errors) : Exception("Validation failed")
{
    public List<string> Errors { get; } = errors;
}

/// <summary>
/// Translates between the relational schema and the nested "content object" shape the frontend has always
/// used (same shape as window.SITE_CONTENT_DEFAULT[lang]), so the render code never has to change.
/// </summary>
public class ContentService(AppDbContext db)
{
    static readonly string[] Categories = { "stem", "humanities", "testing" };

    // Paths that live in dedicated tables instead of the generic SiteContent key/value table.
    static readonly HashSet<string> DedicatedPaths = new()
    {
        "faq.items", "curriculum.stem", "curriculum.humanities", "curriculum.testing",
        "pricing.tier1", "pricing.tier2", "pricing.tier3",
        "mentorship.name", "mentorship.credentials", "mentorship.bio",
        "contact.whatsapp.url", "contact.telegram.url", "contact.email.address",
        "footer.instagramUrl", "footer.linkedinUrl"
    };

    // ------------------------------------------------------------------ read

    public async Task<JsonObject> BuildAllAsync(bool forAdmin)
    {
        var all = new JsonObject();
        foreach (var lang in Langs.All) all[lang] = await BuildLangAsync(lang, forAdmin);
        return all;
    }

    public async Task<Dictionary<string, string>> GetFlatSiteContentAsync(string lang) =>
        await db.SiteContent.Where(x => x.LanguageCode == lang).OrderBy(x => x.Id).ToDictionaryAsync(x => x.Key, x => x.Value);

    public async Task<JsonObject> BuildLangAsync(string lang, bool forAdmin)
    {
        var root = new JsonObject();

        foreach (var e in await db.SiteContent.Where(x => x.LanguageCode == lang).OrderBy(x => x.Id).ToListAsync())
            SetPath(root, e.Key, JsonValue.Create(e.Value));

        SetPath(root, "faq.items", await BuildFaqAsync(lang, forAdmin));

        foreach (var c in Categories)
            SetPath(root, $"curriculum.{c}", await BuildCurriculumAsync(lang, c));

        var tiers = await BuildPricingAsync(lang);
        foreach (var (k, v) in tiers) SetPath(root, $"pricing.{k}", v);

        var profile = await BuildTeacherAsync(lang);
        if (profile != null)
        {
            SetPath(root, "mentorship.name", JsonValue.Create(profile["name"]!.GetValue<string>()));
            SetPath(root, "mentorship.credentials", JsonValue.Create(profile["credentials"]!.GetValue<string>()));
            SetPath(root, "mentorship.bio", JsonValue.Create(profile["bio"]!.GetValue<string>()));
            SetPath(root, "contact.whatsapp.url", JsonValue.Create(profile["whatsappUrl"]!.GetValue<string>()));
            SetPath(root, "contact.telegram.url", JsonValue.Create(profile["telegramUrl"]!.GetValue<string>()));
            SetPath(root, "contact.email.address", JsonValue.Create(profile["email"]!.GetValue<string>()));
            SetPath(root, "footer.instagramUrl", JsonValue.Create(profile["instagramUrl"]!.GetValue<string>()));
            SetPath(root, "footer.linkedinUrl", JsonValue.Create(profile["linkedinUrl"]!.GetValue<string>()));
        }
        return root;
    }

    public async Task<JsonArray> BuildFaqAsync(string lang, bool includeEmpty)
    {
        var items = await db.FaqItems.Include(x => x.Translations).OrderBy(x => x.DisplayOrder).ToListAsync();
        var arr = new JsonArray();
        foreach (var it in items)
        {
            var t = it.Translations.FirstOrDefault(x => x.LanguageCode == lang);
            var q = t?.Question ?? "";
            var a = t?.Answer ?? "";
            var complete = !string.IsNullOrWhiteSpace(q) && !string.IsNullOrWhiteSpace(a);
            if (!includeEmpty && !complete) continue;
            arr.Add(new JsonObject { ["q"] = q, ["a"] = a });
        }
        return arr;
    }

    public async Task<JsonObject> BuildCurriculumObjectAsync(string lang)
    {
        var o = new JsonObject();
        foreach (var c in Categories) o[c] = await BuildCurriculumAsync(lang, c);
        return o;
    }

    async Task<JsonArray> BuildCurriculumAsync(string lang, string category)
    {
        var tracks = await db.CurriculumTracks.Include(x => x.Translations)
            .Where(x => x.Category == category).OrderBy(x => x.DisplayOrder).ToListAsync();
        var arr = new JsonArray();
        foreach (var tr in tracks)
        {
            var t = tr.Translations.FirstOrDefault(x => x.LanguageCode == lang);
            if (t == null) continue;
            arr.Add(new JsonObject
            {
                ["code"] = t.Code,
                ["title"] = t.Title,
                ["desc"] = t.Description,
                ["bullets"] = JsonNode.Parse(t.BulletPointsJson) ?? new JsonArray()
            });
        }
        return arr;
    }

    public async Task<List<KeyValuePair<string, JsonNode>>> BuildPricingAsync(string lang)
    {
        var tiers = await db.PricingTiers.Include(x => x.Translations).OrderBy(x => x.DisplayOrder).ToListAsync();
        var list = new List<KeyValuePair<string, JsonNode>>();
        var n = 0;
        foreach (var tier in tiers)
        {
            n++;
            var t = tier.Translations.FirstOrDefault(x => x.LanguageCode == lang);
            if (t == null) continue;
            var o = new JsonObject();
            if (!string.IsNullOrEmpty(t.Badge)) o["badge"] = t.Badge;
            o["name"] = t.Name;
            o["tag"] = t.Tag;
            o["desc"] = t.Description;
            o["price"] = t.Price;
            o["period"] = t.Period;
            o["features"] = JsonNode.Parse(t.FeaturesJson) ?? new JsonArray();
            o["cta"] = t.ButtonText;
            list.Add(new($"tier{n}", o));
        }
        return list;
    }

    public async Task<JsonObject> BuildPricingObjectAsync(string lang)
    {
        var o = new JsonObject();
        foreach (var (k, v) in await BuildPricingAsync(lang)) o[k] = v;
        return o;
    }

    public async Task<JsonObject?> BuildTeacherAsync(string lang)
    {
        var p = await db.TeacherProfiles.Include(x => x.Translations).OrderBy(x => x.Id).FirstOrDefaultAsync();
        if (p == null) return null;
        var t = p.Translations.FirstOrDefault(x => x.LanguageCode == lang);
        return new JsonObject
        {
            ["name"] = t?.Name ?? "",
            ["credentials"] = t?.Credentials ?? "",
            ["bio"] = t?.Bio ?? "",
            ["photoUrl"] = p.PhotoUrl,
            ["email"] = p.Email,
            ["whatsappUrl"] = p.WhatsappUrl,
            ["telegramUrl"] = p.TelegramUrl,
            ["instagramUrl"] = p.InstagramUrl,
            ["linkedinUrl"] = p.LinkedinUrl
        };
    }

    // ------------------------------------------------------------------ write

    public async Task<bool> IsEmptyAsync() => !await db.SiteContent.AnyAsync();

    /// <summary>Validates then atomically replaces all content-managed tables with the given {en,tr,ru} object.</summary>
    public async Task ReplaceAllAsync(JsonObject all)
    {
        var errors = new List<string>();
        var langs = new Dictionary<string, JsonObject>();
        foreach (var l in Langs.All)
        {
            if (all[l] is JsonObject o) langs[l] = o;
            else errors.Add($"'{l}' dili için içerik bulunamadı.");
        }
        if (errors.Count > 0) throw new ContentValidationException(errors);

        // 1) generic site-wide texts: all three languages mandatory
        var flat = langs.ToDictionary(kv => kv.Key, kv => Flatten(kv.Value));
        var orderedKeys = flat["en"].Keys.Concat(flat["tr"].Keys).Concat(flat["ru"].Keys).Distinct().ToList();
        foreach (var key in orderedKeys)
        {
            var missing = Langs.All.Where(l => !flat[l].TryGetValue(key, out var v) || string.IsNullOrWhiteSpace(v)).ToList();
            if (missing.Count > 0) errors.Add($"'{key}' alanı şu dil(ler)de boş veya eksik: {string.Join(", ", missing.Select(m => m.ToUpperInvariant()))}.");
        }

        // 2) curriculum
        var curriculum = new List<(string cat, int order, Dictionary<string, JsonObject> perLang)>();
        foreach (var cat in Categories)
        {
            var arrays = Langs.All.ToDictionary(l => l, l => GetArray(langs[l], $"curriculum.{cat}"));
            var counts = arrays.Values.Select(a => a.Count).Distinct().ToList();
            if (counts.Count > 1) { errors.Add($"Müfredat '{cat}' sekmesindeki kart sayısı üç dilde aynı olmalı."); continue; }
            for (var i = 0; i < counts[0]; i++)
            {
                var per = new Dictionary<string, JsonObject>();
                foreach (var l in Langs.All)
                {
                    var o = arrays[l][i] as JsonObject ?? new JsonObject();
                    per[l] = o;
                    if (IsBlank(o["title"])) errors.Add($"Müfredat '{cat}' #{i + 1} başlığı {l.ToUpperInvariant()} dilinde boş.");
                    if (IsBlank(o["desc"])) errors.Add($"Müfredat '{cat}' #{i + 1} açıklaması {l.ToUpperInvariant()} dilinde boş.");
                }
                curriculum.Add((cat, i, per));
            }
        }

        // 3) pricing
        var tierKeys = Langs.All.ToDictionary(l => l, l => (GetPath(langs[l], "pricing") as JsonObject)?.Select(p => p.Key).Where(k => k.StartsWith("tier")).OrderBy(k => k, StringComparer.Ordinal).ToList() ?? new List<string>());
        if (tierKeys.Values.Select(v => string.Join("|", v)).Distinct().Count() > 1)
            errors.Add("Fiyat paketleri üç dilde aynı olmalı.");
        var tiers = new List<(int order, Dictionary<string, JsonObject> perLang)>();
        foreach (var (key, idx) in tierKeys["en"].Select((k, i) => (k, i)))
        {
            var per = new Dictionary<string, JsonObject>();
            foreach (var l in Langs.All)
            {
                var o = GetPath(langs[l], $"pricing.{key}") as JsonObject ?? new JsonObject();
                per[l] = o;
                foreach (var f in new[] { "name", "price", "period", "cta" })
                    if (IsBlank(o[f])) errors.Add($"Fiyat '{key}.{f}' alanı {l.ToUpperInvariant()} dilinde boş.");
            }
            tiers.Add((idx, per));
        }

        // 4) teacher profile
        foreach (var f in new[] { "name", "credentials", "bio" })
            foreach (var l in Langs.All)
                if (IsBlank(GetPath(langs[l], $"mentorship.{f}"))) errors.Add($"'mentorship.{f}' alanı {l.ToUpperInvariant()} dilinde boş.");

        // 5) FAQ (optional per language)
        var faqLists = Langs.All.ToDictionary(l => l, l => GetArray(langs[l], "faq.items"));
        var faqCount = faqLists.Values.Max(a => a.Count);

        if (errors.Count > 0) throw new ContentValidationException(errors);

        var existingProfile = await db.TeacherProfiles.Include(x => x.Translations).OrderBy(x => x.Id).FirstOrDefaultAsync();

        await using var tx = await db.Database.BeginTransactionAsync();

        await db.SiteContent.ExecuteDeleteAsync();
        await db.FaqItems.ExecuteDeleteAsync();
        await db.CurriculumTracks.ExecuteDeleteAsync();
        await db.PricingTiers.ExecuteDeleteAsync();

        foreach (var key in orderedKeys)
            foreach (var l in Langs.All)
                db.SiteContent.Add(new SiteContentEntry { Key = key, LanguageCode = l, Value = flat[l][key] });

        var faqOrder = 0;
        for (var i = 0; i < faqCount; i++)
        {
            var item = new FaqItem { DisplayOrder = faqOrder };
            var anyText = false;
            foreach (var l in Langs.All)
            {
                var o = i < faqLists[l].Count ? faqLists[l][i] as JsonObject : null;
                var q = Str(o?["q"]);
                var a = Str(o?["a"]);
                if (q.Trim().Length > 0 || a.Trim().Length > 0) anyText = true;
                item.Translations.Add(new FaqTranslation { LanguageCode = l, Question = q, Answer = a });
            }
            if (!anyText) continue;
            faqOrder++;
            db.FaqItems.Add(item);
        }

        foreach (var (cat, order, per) in curriculum)
        {
            var track = new CurriculumTrack { Category = cat, DisplayOrder = order };
            foreach (var l in Langs.All)
                track.Translations.Add(new CurriculumTrackTranslation
                {
                    LanguageCode = l,
                    Code = Str(per[l]["code"]),
                    Title = Str(per[l]["title"]),
                    Description = Str(per[l]["desc"]),
                    BulletPointsJson = (per[l]["bullets"] ?? new JsonArray()).ToJsonString()
                });
            db.CurriculumTracks.Add(track);
        }

        foreach (var (order, per) in tiers)
        {
            var tier = new PricingTier { DisplayOrder = order };
            foreach (var l in Langs.All)
                tier.Translations.Add(new PricingTierTranslation
                {
                    LanguageCode = l,
                    Name = Str(per[l]["name"]),
                    Badge = IsBlank(per[l]["badge"]) ? null : Str(per[l]["badge"]),
                    Tag = Str(per[l]["tag"]),
                    Description = Str(per[l]["desc"]),
                    Price = Str(per[l]["price"]),
                    Period = Str(per[l]["period"]),
                    FeaturesJson = (per[l]["features"] ?? new JsonArray()).ToJsonString(),
                    ButtonText = Str(per[l]["cta"])
                });
            db.PricingTiers.Add(tier);
        }

        var profile = existingProfile ?? new TeacherProfile();
        profile.WhatsappUrl = LanguageNeutral(langs, "contact.whatsapp.url", existingProfile?.WhatsappUrl);
        profile.TelegramUrl = LanguageNeutral(langs, "contact.telegram.url", existingProfile?.TelegramUrl);
        profile.Email = LanguageNeutral(langs, "contact.email.address", existingProfile?.Email);
        profile.InstagramUrl = LanguageNeutral(langs, "footer.instagramUrl", existingProfile?.InstagramUrl);
        profile.LinkedinUrl = LanguageNeutral(langs, "footer.linkedinUrl", existingProfile?.LinkedinUrl);
        foreach (var l in Langs.All)
        {
            var t = profile.Translations.FirstOrDefault(x => x.LanguageCode == l);
            if (t == null) { t = new TeacherProfileTranslation { LanguageCode = l }; profile.Translations.Add(t); }
            t.Name = Str(GetPath(langs[l], "mentorship.name"));
            t.Credentials = Str(GetPath(langs[l], "mentorship.credentials"));
            t.Bio = Str(GetPath(langs[l], "mentorship.bio"));
        }
        if (existingProfile == null) db.TeacherProfiles.Add(profile);

        await db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    /// <summary>
    /// URL / e-mail values are stored once (TeacherProfile), while the admin UI shows them per language.
    /// If the three values disagree, the one that differs from what is currently stored is the edit.
    /// </summary>
    static string LanguageNeutral(Dictionary<string, JsonObject> langs, string path, string? current)
    {
        var values = Langs.All.Select(l => Str(GetPath(langs[l], path)).Trim()).ToList();
        var changed = values.FirstOrDefault(v => v.Length > 0 && v != current);
        return changed ?? (string.IsNullOrEmpty(current) ? values.FirstOrDefault(v => v.Length > 0) ?? "" : current);
    }

    // ------------------------------------------------------------------ json helpers

    static bool IsBlank(JsonNode? n) => n == null || string.IsNullOrWhiteSpace(n is JsonValue v && v.TryGetValue<string>(out var s) ? s : n.ToString());

    static string Str(JsonNode? n) => n == null ? "" : n is JsonValue v && v.TryGetValue<string>(out var s) ? s : n.ToString();

    static JsonArray GetArray(JsonObject root, string path) => GetPath(root, path) as JsonArray ?? new JsonArray();

    static JsonNode? GetPath(JsonNode? node, string path)
    {
        foreach (var part in path.Split('.'))
        {
            node = node switch
            {
                JsonObject o => o[part],
                JsonArray a when int.TryParse(part, out var i) && i < a.Count => a[i],
                _ => null
            };
            if (node == null) return null;
        }
        return node;
    }

    static Dictionary<string, string> Flatten(JsonObject root)
    {
        var d = new Dictionary<string, string>();
        void Walk(JsonNode? n, string path)
        {
            if (DedicatedPaths.Contains(path)) return;
            switch (n)
            {
                case JsonObject o: foreach (var (k, v) in o) Walk(v, path.Length == 0 ? k : $"{path}.{k}"); break;
                case JsonArray a: for (var i = 0; i < a.Count; i++) Walk(a[i], $"{path}.{i}"); break;
                case null: break;
                default: d[path] = Str(n); break;
            }
        }
        Walk(root, "");
        return d;
    }

    static void SetPath(JsonObject root, string path, JsonNode? value)
    {
        var parts = path.Split('.');
        JsonNode cur = root;
        for (var i = 0; i < parts.Length; i++)
        {
            var last = i == parts.Length - 1;
            var isIndex = int.TryParse(parts[i], out var idx);
            JsonNode? next = last ? value : (int.TryParse(parts[i + 1], out _) ? new JsonArray() : new JsonObject());
            if (cur is JsonObject o)
            {
                if (last) o[parts[i]] = value;
                else if (o[parts[i]] == null) o[parts[i]] = next;
                cur = last ? cur : o[parts[i]]!;
            }
            else if (cur is JsonArray a && isIndex)
            {
                while (a.Count <= idx) a.Add(null);
                if (last) a[idx] = value;
                else if (a[idx] == null) a[idx] = next;
                cur = last ? cur : a[idx]!;
            }
        }
    }
}
