$url = 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791386645101'
$doc = Invoke-RestMethod -Uri $url -Method Get
$chaps = $doc.fields.audioChapters.arrayValue.values
$results = @()
foreach ($c in $chaps) {
    $results += [PSCustomObject]@{
        title = $c.mapValue.fields.title.stringValue
        audioUrl = $c.mapValue.fields.audioUrl.stringValue
        hasAudio = [string]::IsNullOrWhiteSpace($c.mapValue.fields.audioUrl.stringValue) -eq $false
    }
}
$results | Format-Table -AutoSize
