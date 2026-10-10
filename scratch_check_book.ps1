$url = 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791386645101'
$doc = Invoke-RestMethod -Uri $url -Method Get
Write-Host "Title:" $doc.fields.title.stringValue
Write-Host "isPublished:" $doc.fields.isPublished.booleanValue
Write-Host "audioChapters Count:" $doc.fields.audioChapters.arrayValue.values.Count
Write-Host "Chapter 0 Audio:" $doc.fields.audioChapters.arrayValue.values[0].mapValue.fields.audioUrl.stringValue
