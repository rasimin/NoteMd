Option Explicit

Dim fso, shell, appDir, port, settingsPath, text, re, matches
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
port = "3001"
settingsPath = fso.BuildPath(appDir, "settings.json")

If fso.FileExists(settingsPath) Then
  On Error Resume Next
  text = fso.OpenTextFile(settingsPath, 1, False).ReadAll
  On Error GoTo 0
  If Len(text) > 0 Then
    Set re = New RegExp
    re.Pattern = """port""\s*:\s*(\d+)"
    re.IgnoreCase = True
    If re.Test(text) Then
      Set matches = re.Execute(text)
      port = matches(0).SubMatches(0)
    End If
  End If
End If

Dim browser, candidates, c
candidates = Array( _
  shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"), _
  shell.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"), _
  shell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"), _
  shell.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\chrome.exe"), _
  shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"), _
  shell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe") _
)

browser = ""
For Each c In candidates
  If Len(c) > 0 And fso.FileExists(c) Then
    browser = c
    Exit For
  End If
Next

Dim reachable, http
reachable = False
On Error Resume Next
Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
http.SetTimeouts 600, 600, 600, 800
http.Open "GET", "http://127.0.0.1:" & port & "/api/me", False
http.Send
If Err.Number = 0 Then
  reachable = True
End If
Err.Clear
On Error GoTo 0

Dim targetUrl, offlineFile
If reachable Then
  targetUrl = "http://localhost:" & port & "/cepat"
Else
  offlineFile = Replace(fso.BuildPath(appDir, "public\cepat-offline.html"), "\", "/")
  offlineFile = Replace(offlineFile, " ", "%20")
  targetUrl = "file:///" & offlineFile & "?port=" & port
End If

If Len(browser) > 0 Then
  shell.Run """" & browser & """ --app=" & targetUrl, 1, False
Else
  shell.Run """" & targetUrl & """", 1, False
End If
