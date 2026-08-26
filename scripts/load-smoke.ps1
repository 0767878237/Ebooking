param(
    [string]$BaseUrl = "http://localhost:8080",
    [Parameter(Mandatory = $true)][string]$ShowId,
    [Parameter(Mandatory = $true)][string]$SeatId,
    [Parameter(Mandatory = $true)][string]$UserId,
    [int]$Requests = 20
)

Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$tasks = @()

for ($index = 0; $index -lt $Requests; $index++) {
    $request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::Post,
        "$BaseUrl/api/shows/$ShowId/holds")
    $request.Headers.Add("X-User-Id", $UserId)
    $request.Headers.Add("Idempotency-Key", "load-$([guid]::NewGuid())")
    $payload = @{ userId = $UserId; seatIds = @($SeatId) } | ConvertTo-Json -Compress
    $request.Content = [System.Net.Http.StringContent]::new(
        $payload,
        [System.Text.Encoding]::UTF8,
        "application/json")
    $tasks += $client.SendAsync($request)
}

$responses = [System.Threading.Tasks.Task]::WhenAll($tasks).GetAwaiter().GetResult()
$statusCodes = $responses | ForEach-Object { [int]$_.StatusCode }
$summary = $statusCodes | Group-Object | Sort-Object Name
$summary | ForEach-Object {
    "HTTP $($_.Name): $($_.Count)"
}

$successCount = ($statusCodes | Where-Object { $_ -eq 201 }).Count
$conflictCount = ($statusCodes | Where-Object { $_ -eq 409 }).Count
if ($successCount -ne 1 -or ($successCount + $conflictCount) -ne $Requests) {
    throw "Unexpected contention result. Expected one 201 and the rest 409."
}

Write-Output "PASS: one request acquired the seat and all other requests conflicted."
