using System.Text.Json.Nodes;
using EnglishTutor.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace EnglishTutor.Api.Services;

public static class SeedData
{
    /// <summary>Imports the exact content that used to live in content-data.js (only when the DB is empty).</summary>
    public static async Task SeedContentAsync(IServiceProvider sp, ILogger logger)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var svc = scope.ServiceProvider.GetRequiredService<ContentService>();
        if (!await svc.IsEmptyAsync()) return;

        var path = Path.Combine(AppContext.BaseDirectory, "Seed", "content.seed.json");
        var all = JsonNode.Parse(await File.ReadAllTextAsync(path))!.AsObject();
        await svc.ReplaceAllAsync(all);

        var profile = await db.TeacherProfiles.FirstAsync();
        profile.PhotoUrl = "assets/images/hero-teacher.jpg";
        await db.SaveChangesAsync();
        logger.LogInformation("Database seeded from content.seed.json");
    }

    public static async Task EnsureAdminAsync(IServiceProvider sp, IConfiguration config, ILogger logger)
    {
        var username = config["Admin:Username"];
        var password = config["Admin:Password"];
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Admin:Username / Admin:Password are not configured (use dotnet user-secrets) - no admin user was created or updated.");
            return;
        }
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null)
            db.AdminUsers.Add(new Models.AdminUser { Username = username, PasswordHash = BCrypt.Net.BCrypt.HashPassword(password) });
        else if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password); // rotating the secret rotates the password
        await db.SaveChangesAsync();
    }
}
