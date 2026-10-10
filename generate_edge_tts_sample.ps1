param(
    [string]$Voice = "ar-EG-SalmaNeural",
    [string]$OutputFile = "sample_salma.mp3"
)

$arabicText = [System.IO.File]::ReadAllText("$PSScriptRoot\sample_prompt_text.txt", [System.Text.Encoding]::UTF8)

Add-Type -AssemblyName System.Net.WebSockets
Add-Type -AssemblyName System.Security

function Get-SecMsGec {
    $winEpoch = 11644473600
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $ticks = [long]($now + $winEpoch)
    $ticks = $ticks - ($ticks % 300)
    $trustedToken = "6A5AA1D4EAFF4E9FB37E23D68491D6F4"
    $strToHash = "$ticks$trustedToken"
    
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($strToHash)
    $hash = $sha256.ComputeHash($bytes)
    return [BitConverter]::ToString($hash).Replace("-", "").ToUpper()
}

$secGec = Get-SecMsGec
$trustedToken = "6A5AA1D4EAFF4E9FB37E23D68491D6F4"
$wssUrl = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=$trustedToken&Sec-MS-GEC=$secGec&Sec-MS-GEC-Version=1-143.0.3650.75"

Write-Host "Connecting to Edge TTS with voice: $Voice..."
$ws = New-Object System.Net.WebSockets.ClientWebSocket
$ws.Options.SetRequestHeader("Pragma", "no-cache")
$ws.Options.SetRequestHeader("Cache-Control", "no-cache")
$ws.Options.SetRequestHeader("Origin", "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold")
$ws.Options.SetRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0")

$ct = [System.Threading.CancellationToken]::None
$connectTask = $ws.ConnectAsync([Uri]$wssUrl, $ct)
$connectTask.Wait(8000)

if ($ws.State -ne [System.Net.WebSockets.WebSocketState]::Open) {
    Write-Error "Failed to connect to Edge TTS: $($ws.State)"
    exit 1
}

Write-Host "Connected successfully! Sending speech synthesis request..."

$connId = [Guid]::NewGuid().ToString("N")
$dateStr = [DateTime]::UtcNow.ToString("r")

# 1. Config message
$configMsg = "X-Timestamp:$dateStr`r`nContent-Type:application/json; charset=utf-8`r`nPath:speech.config`r`n`r`n{`"context`":{`"synthesis`":{`"audio`":{`"metadataoptions`":{`"sentenceBoundaryEnabled`":`"false`",`"wordBoundaryEnabled`":`"false`"},`"outputFormat`":`"audio-24khz-48kbitrate-mono-mp3`"}}}}"
$cfgBytes = [System.Text.Encoding]::UTF8.GetBytes($configMsg)
$sendTask = $ws.SendAsync([ArraySegment[byte]]$cfgBytes, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct)
$sendTask.Wait()

# 2. SSML message
$ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ar-EG'><voice name='$Voice'><prosody pitch='+0Hz' rate='+0%'>$arabicText</prosody></voice></speak>"
$ssmlMsg = "X-RequestId:$connId`r`nContent-Type:application/ssml+xml`r`nX-Timestamp:$dateStr`r`nPath:ssml`r`n`r`n$ssml"
$ssmlBytes = [System.Text.Encoding]::UTF8.GetBytes($ssmlMsg)
$sendTask = $ws.SendAsync([ArraySegment[byte]]$ssmlBytes, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct)
$sendTask.Wait()

# 3. Receive audio stream
$audioStream = New-Object System.IO.MemoryStream
$recvBuffer = New-Object byte[] 65536
$isTurnEnd = $false

while ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open -and -not $isTurnEnd) {
    $segment = New-Object ArraySegment[byte] -ArgumentList @($recvBuffer, 0, $recvBuffer.Length)
    $resTask = $ws.ReceiveAsync($segment, $ct)
    $resTask.Wait()
    $res = $resTask.Result

    if ($res.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Binary) {
        if ($res.Count -gt 2) {
            $headerLen = ($recvBuffer[0] -shl 8) -bor $recvBuffer[1]
            $dataOffset = 2 + $headerLen
            if ($res.Count -gt $dataOffset) {
                $audioDataLen = $res.Count - $dataOffset
                $audioStream.Write($recvBuffer, $dataOffset, $audioDataLen)
            }
        }
    }
    elseif ($res.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Text) {
        $textMsg = [System.Text.Encoding]::UTF8.GetString($recvBuffer, 0, $res.Count)
        if ($textMsg -match "Path:turn.end") {
            $isTurnEnd = $true
        }
    }
}

$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", $ct).Wait(1000)

if ($audioStream.Length -gt 0) {
    [System.IO.File]::WriteAllBytes("$PSScriptRoot\$OutputFile", $audioStream.ToArray())
    Write-Host "SUCCESS: Generated audio file -> $OutputFile ($($audioStream.Length) bytes)"
} else {
    Write-Error "No audio data received."
}
