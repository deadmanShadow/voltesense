using FluentAssertions;
using VoltSense.Infrastructure.Persistence;

namespace VoltSense.Infrastructure.Tests.Persistence;

/// <summary>
/// Unit tests for <see cref="ConnectionStringNormalizer"/>.
///
/// Why these tests matter: Render's <c>fromService</c> blueprint directive
/// injects the database connection as a URL
/// (<c>postgres://user:pass@host:port/db</c>). Npgsql's
/// <c>NpgsqlConnectionStringBuilder</c> — and the legacy
/// <c>DbConnectionOptions</c> parser that EF Core's migration history
/// probe runs through — only accept keyword/value form. Passing a URL
/// through verbatim throws
/// <c>ArgumentException: Format of the initialization string does not
/// conform to specification starting at index 0</c>, which crashed the
/// first Render boot at the migration step.
///
/// These tests pin the conversion contract so a future refactor of the
/// normalizer can't silently break the Render deployment path.
/// </summary>
public class ConnectionStringNormalizerTests
{
    [Fact]
    public void Normalize_Should_Return_Null_For_Null_Input()
    {
        // No-op pass-through so Program.cs's null-guard still triggers.
        ConnectionStringNormalizer.Normalize(null).Should().BeNull();
    }

    [Fact]
    public void Normalize_Should_Return_Empty_For_Empty_Input()
    {
        ConnectionStringNormalizer.Normalize(string.Empty).Should().Be(string.Empty);
    }

    [Fact]
    public void Normalize_Should_Return_Whitespace_For_Whitespace_Input()
    {
        // Whitespace is the program's "not configured" sentinel; the
        // existing null-guard treats it the same as null.
        ConnectionStringNormalizer.Normalize("   ").Should().Be("   ");
    }

    [Fact]
    public void Normalize_Should_Passthrough_Keyword_Form_Input_Untouched()
    {
        // Keyword form is the canonical local config — must not be
        // rewritten, or we'll silently break docker-compose / appsettings.
        var keyword =
            "Host=db;Port=5432;Database=voltsense;Username=voltsense;Password=dev";

        ConnectionStringNormalizer.Normalize(keyword).Should().Be(keyword);
    }

    [Fact]
    public void Normalize_Should_Convert_Basic_Postgres_Url_To_Keyword_Form()
    {
        // The exact shape Render's `fromService` emits on free tier.
        var url = "postgres://voltsense:voltsense_dev_only@voltsense-db/voltsense";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().NotBeNull();
        result.Should().Contain("Host=voltsense-db");
        result.Should().Contain("Database=voltsense");
        result.Should().Contain("Username=voltsense");
        result.Should().Contain("Password=voltsense_dev_only");
    }

    [Fact]
    public void Normalize_Should_Convert_Postgresql_Scheme()
    {
        // The official IETF-registered scheme — must be accepted too.
        var url = "postgresql://user:pw@host.example.com/mydb";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().Contain("Host=host.example.com");
        result.Should().Contain("Database=mydb");
        result.Should().Contain("Username=user");
        result.Should().Contain("Password=pw");
    }

    [Fact]
    public void Normalize_Should_Include_Port_When_Present_In_Url()
    {
        var url = "postgres://user:pw@host.example.com:5433/mydb";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().Contain("Port=5433");
    }

    [Fact]
    public void Normalize_Should_Omit_Port_When_Absent_From_Url()
    {
        // No port in the URL → Npgsql defaults to 5432. We must NOT
        // emit `Port=0` or any explicit port, which would override
        // Npgsql's default to an invalid value.
        var url = "postgres://user:pw@host.example.com/mydb";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().NotContain("Port=");
    }

    [Fact]
    public void Normalize_Should_Decode_Percent_Encoded_Password()
    {
        // Render-generated passwords can contain characters that get
        // percent-encoded in the URL (e.g. `@` → `%40`, `+` → `%2B`).
        // The decoded password must match the original.
        var url = "postgres://voltsense:p%40ss%2Bword@host/db";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().Contain("Password=p@ss+word");
        result.Should().NotContain("%40");
        result.Should().NotContain("%2B");
    }

    [Fact]
    public void Normalize_Should_Decode_Percent_Encoded_Username()
    {
        var url = "postgres://us%40er:pw@host/db";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().Contain("Username=us@er");
    }

    [Fact]
    public void Normalize_Should_Forward_Query_Parameters_As_Keywords()
    {
        // Fly.io / Heroku-style URLs frequently carry `sslmode` or
        // `application_name` in the query string.
        var url =
            "postgres://user:pw@host/db?sslmode=require&application_name=voltsense";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().Contain("sslmode=require");
        result.Should().Contain("application_name=voltsense");
    }

    [Fact]
    public void Normalize_Should_Not_Duplicate_Structural_Keys_From_Query_String()
    {
        // A URL like `postgres://u:p@h/d?Host=evil` must NOT have its
        // Host overwritten by a hostile query string. The structured
        // URL parts win.
        var url = "postgres://user:pw@real-host/db?Host=evil-host";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().Contain("Host=real-host");
        result.Should().NotContain("Host=evil-host");
    }

    [Fact]
    public void Normalize_Should_Be_Case_Insensitive_On_Url_Scheme()
    {
        // Some emitters use uppercase scheme prefixes.
        var url = "POSTGRES://user:pw@host/db";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().Contain("Host=host");
        result.Should().Contain("Database=db");
    }

    [Fact]
    public void Normalize_Should_Trim_Leading_And_Trailing_Whitespace_Before_Detecting_Url()
    {
        // Defensive: some shells leave a stray newline on env-var values.
        var url = "  postgres://user:pw@host/db  \n";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().Contain("Host=host");
        result.Should().Contain("Database=db");
    }

    [Fact]
    public void Normalize_Should_Handle_Username_Only_UserInfo()
    {
        // `postgres://user@host/db` — no colon, no password.
        var url = "postgres://readonly-user@host/db";

        var result = ConnectionStringNormalizer.Normalize(url);

        result.Should().Contain("Username=readonly-user");
        result.Should().NotContain("Password=");
    }
}
