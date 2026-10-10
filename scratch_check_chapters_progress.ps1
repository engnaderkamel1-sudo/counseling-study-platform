$url = 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791386645101'
$doc = Invoke-RestMethod -Uri $url -Method Get
$chaps = $doc.fields.audioChapters.arrayValue.values
$i = 0
$rows = @()
foreach ($c in $chaps) {
    $rows += [PSCustomObject]@{
        index = $i
        title = $c.mapValue.fields.title.stringValue
        startPage = $c.mapValue.fields.startPage.integerValue
        endPage = $c.mapValue.fields.endPage.integerValue
        lastExtractedPage = $c.mapValue.fields.lastExtractedPage.integerValue
        isComplete = $c.mapValue.fields.isComplete.booleanValue
        textLen = if ($c.mapValue.fields.text.stringValue) { $c.mapValue.fields.text.stringValue.Length } else { 0 }
    }
    $i++
}
$rows | Format-Table -AutoSize
