$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$port = 9222
$proc = Start-Process -FilePath $edgePath -ArgumentList "--remote-debugging-port=$port", "--headless=new", "--disable-gpu", "about:blank" -PassThru
Start-Sleep -Milliseconds 1500

try {
    $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json"
    $wsUrl = $targets[0].webSocketDebuggerUrl
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ct = [System.Threading.CancellationToken]::None
    $ws.ConnectAsync([Uri]$wsUrl, $ct).Wait()

    $enablePayload = @{ id = 1; method = "Runtime.enable" } | ConvertTo-Json -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($enablePayload)
    $ws.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
    $buf = [byte[]]::new(65536)
    $ws.ReceiveAsync([ArraySegment[byte]]::new($buf), $ct).Wait()

    function Test-Expr($expr) {
        $msgId = [System.Threading.Interlocked]::Increment([ref]$script:idCounter)
        $payload = @{
            id = $msgId
            method = "Runtime.compileScript"
            params = @{ expression = $expr; sourceURL = "test.js"; persistScript = $false }
        } | ConvertTo-Json -Compress
        $b = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $ws.SendAsync([ArraySegment[byte]]::new($b), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()

        while ($true) {
            $buffer = [byte[]]::new(65536)
            $r = $ws.ReceiveAsync([ArraySegment[byte]]::new($buffer), $ct).Result
            $s = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $r.Count)
            if ($s -match """id"":$msgId") {
                return $s
            }
        }
    }
    $script:idCounter = 10

    $lines = Get-Content "src/pages/LecturesPage.js"

    # Test Section 5 (lines 1815 to 1944)
    $sec5 = ($lines[1815..1943] -join "`n")
    Write-Host "Section 5 test: $(Test-Expr "function t() { return (`n$sec5`n); }")"

    # Test Section 4 (lines 1797 to 1813)
    $sec4 = ($lines[1797..1813] -join "`n")
    Write-Host "Section 4 test: $(Test-Expr "function t() { return (`n$sec4`n); }")"

    # Test Section 1 (lines 1669 to 1688)
    $sec1 = ($lines[1669..1688] -join "`n")
    Write-Host "Section 1 test: $(Test-Expr "function t() { return (`n$sec1`n); }")"

} finally {
    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
}
