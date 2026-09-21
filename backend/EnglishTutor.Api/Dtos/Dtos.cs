using System.ComponentModel.DataAnnotations;

namespace EnglishTutor.Api.Dtos;

public record LoginRequest([Required, MaxLength(100)] string Username, [Required, MaxLength(200)] string Password);

public record LoginResponse(string Token, DateTime ExpiresAtUtc);

public record ContactRequest(
    [Required, StringLength(200, MinimumLength = 2)] string StudentName,
    [Required, EmailAddress, StringLength(200)] string ParentEmail,
    [Required, StringLength(60, MinimumLength = 5)] string ParentPhone,
    [StringLength(300)] string? Topic,
    [StringLength(4000)] string? Message);

public record FaqTranslationDto(string? Question, string? Answer);

/// <summary>All three languages travel in one request; a language may be left empty (item is then hidden in it).</summary>
public record FaqUpsertRequest([Required] Dictionary<string, FaqTranslationDto> Translations);
