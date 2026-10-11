$ErrorActionPreference = "Stop"

$jsonText = [System.IO.File]::ReadAllText("$(Get-Location)\term1_lectures.json", [System.Text.Encoding]::UTF8)
$lectures = ConvertFrom-Json $jsonText

$baseUrl = "https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/lectures"

Write-Host "Seeding Term 1 lectures to Firestore..." -ForegroundColor Cyan

$count = 0
foreach ($lec in $lectures) {
    $docId = $lec.id
    $url = "$baseUrl/$docId"
    
    $fields = @{
        id = @{ stringValue = [string]$lec.id }
        orderIndex = @{ integerValue = [string]$lec.orderIndex }
        sessionOrder = @{ integerValue = [string]$lec.sessionOrder }
        date = @{ stringValue = [string]$lec.date }
        title = @{ stringValue = [string]$lec.title }
        subject = @{ stringValue = [string]$lec.subject }
        speaker = @{ stringValue = [string]$lec.speaker }
        notes = @{ stringValue = [string]$lec.notes }
        mediaUrl = @{ stringValue = [string]$lec.mediaUrl }
        handoutUrl = @{ stringValue = [string]$lec.handoutUrl }
        handoutName = @{ stringValue = [string]$lec.handoutName }
        audioSummaryUrl = @{ stringValue = [string]$lec.audioSummaryUrl }
        writtenSummary = @{ stringValue = [string]$lec.writtenSummary }
        quizQuestions = @{ arrayValue = @{ values = @() } }
        lastPosition = @{ integerValue = "0" }
    }
    
    $payload = @{ fields = $fields }
    $jsonBody = ConvertTo-Json $payload -Depth 5 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
    
    try {
        $res = Invoke-RestMethod -Uri $url -Method Patch -Body $bytes -ContentType "application/json; charset=utf-8"
        $count++
        Write-Host "[$count/24] Saved: $($lec.orderIndex). $($lec.title) - $($lec.date)" -ForegroundColor Green
    } catch {
        Write-Host "Error saving $($lec.title): $_" -ForegroundColor Red
    }
}

Write-Host "`nSuccessfully saved $count lectures to Firestore!" -ForegroundColor Yellow
