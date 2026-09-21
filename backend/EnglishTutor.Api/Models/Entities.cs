using System.ComponentModel.DataAnnotations;

namespace EnglishTutor.Api.Models;

public static class Langs
{
    public static readonly string[] All = { "en", "tr", "ru" };
}

/// <summary>Single site-wide text (hero title, button labels, ...). Unique on (Key, LanguageCode).</summary>
public class SiteContentEntry
{
    public int Id { get; set; }
    [MaxLength(200)] public string Key { get; set; } = "";
    [MaxLength(5)] public string LanguageCode { get; set; } = "";
    public string Value { get; set; } = "";
}

public class FaqItem
{
    public int Id { get; set; }
    public int DisplayOrder { get; set; }
    public List<FaqTranslation> Translations { get; set; } = new();
}

/// <summary>Question/Answer may be empty for a language: that language then simply hides the item.</summary>
public class FaqTranslation
{
    public int Id { get; set; }
    public int FaqItemId { get; set; }
    public FaqItem? FaqItem { get; set; }
    [MaxLength(5)] public string LanguageCode { get; set; } = "";
    public string Question { get; set; } = "";
    public string Answer { get; set; } = "";
}

public class CurriculumTrack
{
    public int Id { get; set; }
    /// <summary>stem | humanities | testing</summary>
    [MaxLength(30)] public string Category { get; set; } = "";
    public int DisplayOrder { get; set; }
    public List<CurriculumTrackTranslation> Translations { get; set; } = new();
}

public class CurriculumTrackTranslation
{
    public int Id { get; set; }
    public int TrackId { get; set; }
    public CurriculumTrack? Track { get; set; }
    [MaxLength(5)] public string LanguageCode { get; set; } = "";
    [MaxLength(60)] public string Code { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string BulletPointsJson { get; set; } = "[]";
}

public class PricingTier
{
    public int Id { get; set; }
    public int DisplayOrder { get; set; }
    public List<PricingTierTranslation> Translations { get; set; } = new();
}

/// <summary>Price/period live here (not on the tier) because each language shows its own currency.</summary>
public class PricingTierTranslation
{
    public int Id { get; set; }
    public int TierId { get; set; }
    public PricingTier? Tier { get; set; }
    [MaxLength(5)] public string LanguageCode { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Badge { get; set; }
    public string Tag { get; set; } = "";
    public string Description { get; set; } = "";
    [MaxLength(60)] public string Price { get; set; } = "";
    [MaxLength(60)] public string Period { get; set; } = "";
    public string FeaturesJson { get; set; } = "[]";
    public string ButtonText { get; set; } = "";
}

/// <summary>Single-row table.</summary>
public class TeacherProfile
{
    public int Id { get; set; }
    [MaxLength(300)] public string? PhotoUrl { get; set; }
    [MaxLength(200)] public string Email { get; set; } = "";
    [MaxLength(300)] public string WhatsappUrl { get; set; } = "";
    [MaxLength(300)] public string TelegramUrl { get; set; } = "";
    [MaxLength(300)] public string InstagramUrl { get; set; } = "";
    [MaxLength(300)] public string LinkedinUrl { get; set; } = "";
    public List<TeacherProfileTranslation> Translations { get; set; } = new();
}

public class TeacherProfileTranslation
{
    public int Id { get; set; }
    public int ProfileId { get; set; }
    public TeacherProfile? Profile { get; set; }
    [MaxLength(5)] public string LanguageCode { get; set; } = "";
    public string Name { get; set; } = "";
    public string Credentials { get; set; } = "";
    public string Bio { get; set; } = "";
}

public class ContactSubmission
{
    public int Id { get; set; }
    [MaxLength(200)] public string StudentName { get; set; } = "";
    [MaxLength(200)] public string ParentEmail { get; set; } = "";
    [MaxLength(60)] public string ParentPhone { get; set; } = "";
    [MaxLength(300)] public string? Topic { get; set; }
    [MaxLength(4000)] public string? Message { get; set; }
    public DateTime SubmittedAt { get; set; }
    public bool IsRead { get; set; }
}

public class AdminUser
{
    public int Id { get; set; }
    [MaxLength(100)] public string Username { get; set; } = "";
    [MaxLength(200)] public string PasswordHash { get; set; } = "";
}
