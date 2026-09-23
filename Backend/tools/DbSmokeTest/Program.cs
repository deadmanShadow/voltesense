using Npgsql;

// Smoke test: open a connection, run SELECT 1, and report.
// This verifies the connection string + SSL handshake + credentials
// BEFORE we attempt the more expensive migration step.

var connStr = args.Length > 0 ? args[0] : Environment.GetEnvironmentVariable("VOLTSENSE_DB")
    ?? throw new InvalidOperationException("Pass the connection string as arg[0] or set VOLTSENSE_DB.");

try
{
    await using var conn = new NpgsqlConnection(connStr);
    await conn.OpenAsync();

    await using var cmd = new NpgsqlCommand("SELECT version(), current_database(), current_user;", conn);
    await using var rdr = await cmd.ExecuteReaderAsync();
    await rdr.ReadAsync();

    Console.WriteLine($"OK  PG version : {rdr.GetString(0)}");
    Console.WriteLine($"OK  database   : {rdr.GetString(1)}");
    Console.WriteLine($"OK  user       : {rdr.GetString(2)}");
    Console.WriteLine($"OK  server IP  : {conn.Host}:{conn.Port}");
    Console.WriteLine($"OK  state      : {conn.State}");
}
catch (Exception ex)
{
    Console.Error.WriteLine($"FAIL {ex.GetType().Name}: {ex.Message}");
    if (ex.InnerException is not null)
        Console.Error.WriteLine($"     inner: {ex.InnerException.GetType().Name}: {ex.InnerException.Message}");
    return 1;
}

return 0;
