using System.Globalization;

namespace VoltSense.Infrastructure.Persistence;

/// <summary>
/// Normalises Npgsql connection strings into the keyword/value form that
/// <see cref="System.Data.Common.DbConnectionOptions"/> / Npgsql's
/// <c>NpgsqlConnectionStringBuilder</c> require.
/// </summary>
/// <remarks>
/// <para>
/// Some platforms inject connection strings in URL form
/// (<c>postgres://user:pass@host:port/db</c>) — notably Render's
/// <c>fromService</c> blueprint directive, Heroku-style addons, Fly.io
/// attachments, and AWS RDS proxy URL exports. Npgsql and EF Core's
/// migration history probe only accept the keyword/value form
/// (<c>Host=…;Username=…;Password=…;Database=…</c>), so passing a URL
/// in verbatim throws
/// <c>System.ArgumentException: Format of the initialization string
/// does not conform to specification starting at index 0</c>.
/// </para>
/// <para>
/// This normalizer detects both shapes, converts URL to keyword form
/// preserving all parameters, and returns keyword input unchanged.
/// It is intentionally tiny — no allocations beyond what is required,
/// no reflection, no external dependencies.
/// </para>
/// </remarks>
public static class ConnectionStringNormalizer
{
    /// <summary>
    /// Returns a connection string that Npgsql / EF Core can parse.
    /// If <paramref name="raw"/> is already in keyword/value form (or is
    /// null/empty), it is returned unchanged. If it is in URL form, it is
    /// converted to keyword/value form.
    /// </summary>
    /// <param name="raw">The raw connection string from configuration.</param>
    /// <returns>A connection string Npgsql can parse.</returns>
    public static string? Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return raw;
        }

        var trimmed = raw.Trim();

        // Fast path: anything that does not start with a URL scheme we
        // recognise is treated as already-keyword-form and forwarded
        // untouched. This covers `Host=...;Database=...` and the empty
        // case above.
        if (!LooksLikeUrl(trimmed))
        {
            return raw;
        }

        var uri = new Uri(trimmed);
        var sb = new System.Text.StringBuilder(128);

        // ---- Host & Port ---------------------------------------------------
        var host = uri.Host;
        if (uri.Port > 0)
        {
            sb.Append("Host=").Append(host)
              .Append(";Port=").Append(uri.Port.ToString(CultureInfo.InvariantCulture));
        }
        else
        {
            sb.Append("Host=").Append(host);
        }

        // ---- Database (first path segment, trim leading '/') ---------------
        var path = uri.AbsolutePath;            // e.g. "/voltsense"
        if (!string.IsNullOrEmpty(path) && path.Length > 1)
        {
            var dbName = path.TrimStart('/');
            // Strip any trailing segments (defensive — well-formed URLs
            // have exactly one path segment here).
            var slash = dbName.IndexOf('/');
            if (slash >= 0)
            {
                dbName = dbName[..slash];
            }

            if (!string.IsNullOrEmpty(dbName))
            {
                sb.Append(";Database=").Append(PercentDecode(dbName));
            }
        }

        // ---- User & Password (from userinfo) -------------------------------
        // UserInfo is "user:password" — both must be percent-decoded.
        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            var userInfo = uri.UserInfo;
            var colon = userInfo.IndexOf(':');
            if (colon < 0)
            {
                sb.Append(";Username=").Append(PercentDecode(userInfo));
            }
            else
            {
                var user = PercentDecode(userInfo[..colon]);
                var pass = PercentDecode(userInfo[(colon + 1)..]);
                sb.Append(";Username=").Append(user)
                  .Append(";Password=").Append(pass);
            }
        }

        // ---- Query string → keyword pairs -----------------------------------
        // Render's URL has no query string; Fly.io and Heroku-style URLs may
        // include `?sslmode=require&...`. Forward these as keywords.
        if (!string.IsNullOrEmpty(uri.Query))
        {
            var query = uri.Query.TrimStart('?');
            foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var eq = pair.IndexOf('=');
                if (eq <= 0)
                {
                    continue;
                }

                var key = PercentDecode(pair[..eq]);
                var value = PercentDecode(pair[(eq + 1)..]);

                // Skip keys we've already set above from the structured
                // parts of the URL — the structured form wins.
                if (key.Equals("Host", StringComparison.OrdinalIgnoreCase)
                    || key.Equals("Port", StringComparison.OrdinalIgnoreCase)
                    || key.Equals("Database", StringComparison.OrdinalIgnoreCase)
                    || key.Equals("Username", StringComparison.OrdinalIgnoreCase)
                    || key.Equals("Password", StringComparison.OrdinalIgnoreCase)
                    || key.Equals("User Id", StringComparison.OrdinalIgnoreCase)
                    || key.Equals("UserID", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                sb.Append(';').Append(key).Append('=').Append(value);
            }
        }

        return sb.ToString();
    }

    /// <summary>
    /// True when the string starts with a Postgres URL scheme we recognise.
    /// </summary>
    private static bool LooksLikeUrl(string s)
    {
        // The most common shapes Render / Heroku / Fly emit:
        //   postgres://…
        //   postgresql://…
        // Case-insensitive prefix check is the cheapest reliable test.
        return s.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            || s.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// <see cref="Uri.UnescapeDataString"/> is the correct decoder for
    /// URL components (encodes spaces as %20, '+' is literal). RFC 3986
    /// compliant — what Postgres connection-URL emitters use.
    /// </summary>
    private static string PercentDecode(string s)
        => Uri.UnescapeDataString(s);
}
