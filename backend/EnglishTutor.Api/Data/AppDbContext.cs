using EnglishTutor.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EnglishTutor.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SiteContentEntry> SiteContent => Set<SiteContentEntry>();
    public DbSet<FaqItem> FaqItems => Set<FaqItem>();
    public DbSet<FaqTranslation> FaqTranslations => Set<FaqTranslation>();
    public DbSet<CurriculumTrack> CurriculumTracks => Set<CurriculumTrack>();
    public DbSet<CurriculumTrackTranslation> CurriculumTrackTranslations => Set<CurriculumTrackTranslation>();
    public DbSet<PricingTier> PricingTiers => Set<PricingTier>();
    public DbSet<PricingTierTranslation> PricingTierTranslations => Set<PricingTierTranslation>();
    public DbSet<TeacherProfile> TeacherProfiles => Set<TeacherProfile>();
    public DbSet<TeacherProfileTranslation> TeacherProfileTranslations => Set<TeacherProfileTranslation>();
    public DbSet<ContactSubmission> ContactSubmissions => Set<ContactSubmission>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<SiteContentEntry>().HasIndex(x => new { x.Key, x.LanguageCode }).IsUnique();

        b.Entity<FaqTranslation>().HasIndex(x => new { x.FaqItemId, x.LanguageCode }).IsUnique();
        b.Entity<FaqItem>().HasMany(x => x.Translations).WithOne(x => x.FaqItem).HasForeignKey(x => x.FaqItemId).OnDelete(DeleteBehavior.Cascade);

        b.Entity<CurriculumTrackTranslation>().HasIndex(x => new { x.TrackId, x.LanguageCode }).IsUnique();
        b.Entity<CurriculumTrack>().HasMany(x => x.Translations).WithOne(x => x.Track).HasForeignKey(x => x.TrackId).OnDelete(DeleteBehavior.Cascade);

        b.Entity<PricingTierTranslation>().HasIndex(x => new { x.TierId, x.LanguageCode }).IsUnique();
        b.Entity<PricingTier>().HasMany(x => x.Translations).WithOne(x => x.Tier).HasForeignKey(x => x.TierId).OnDelete(DeleteBehavior.Cascade);

        b.Entity<TeacherProfileTranslation>().HasIndex(x => new { x.ProfileId, x.LanguageCode }).IsUnique();
        b.Entity<TeacherProfile>().HasMany(x => x.Translations).WithOne(x => x.Profile).HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Cascade);

        b.Entity<AdminUser>().HasIndex(x => x.Username).IsUnique();
    }
}
