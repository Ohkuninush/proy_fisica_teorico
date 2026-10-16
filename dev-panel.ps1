[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectPath   = $PSScriptRoot
$WebPort       = 5173
$Url           = "http://localhost:$WebPort"
$ServerPidFile = Join-Path $ProjectPath ".dev-server.pid"
$HistoryLimit  = 10
$ReadyTimeoutS = 30

$LogoColors = @("Cyan", "Magenta", "Yellow", "Green", "Red", "DarkYellow")

$Glyphs = @{
    "P" = @("XXXX ", "X   X", "XXXX ", "X    ", "X    ")
    "H" = @("X   X", "X   X", "XXXXX", "X   X", "X   X")
    "Y" = @("X   X", " X X ", "  X  ", "  X  ", "  X  ")
    "S" = @(" XXXX", "X    ", " XXX ", "    X", "XXXX ")
    "I" = @("XXXXX", "  X  ", "  X  ", "  X  ", "XXXXX")
    "C" = @(" XXXX", "X    ", "X    ", "X    ", " XXXX")
    "L" = @("X    ", "X    ", "X    ", "X    ", "XXXXX")
    "A" = @(" XXX ", "X   X", "XXXXX", "X   X", "X   X")
    "B" = @("XXXX ", "X   X", "XXXX ", "X   X", "XXXX ")
    "3" = @("XXXX ", "    X", " XXX ", "    X", "XXXX ")
    "D" = @("XXXX ", "X   X", "X   X", "X   X", "XXXX ")
    " " = @("   ",   "   ",   "   ",   "   ",   "   ")
}

$Palette = @( @(110,150,255), @(150,100,255), @(205,95,255), @(255,100,225), @(110,150,255) )
$Esc = [char]27

function Enable-AnsiColors {
    try {
        Add-Type -Namespace Win32 -Name Con -ErrorAction Stop -MemberDefinition @'
[DllImport("kernel32.dll")] public static extern IntPtr GetStdHandle(int nStdHandle);
[DllImport("kernel32.dll")] public static extern bool GetConsoleMode(IntPtr hConsole, out uint mode);
[DllImport("kernel32.dll")] public static extern bool SetConsoleMode(IntPtr hConsole, uint mode);
'@
        $handle = [Win32.Con]::GetStdHandle(-11)
        [uint32]$mode = 0
        if (-not [Win32.Con]::GetConsoleMode($handle, [ref]$mode)) { return $false }
        return [Win32.Con]::SetConsoleMode($handle, ($mode -bor 0x0004))
    } catch { return $false }
}
$UseTrueColor = [bool]($env:WT_SESSION -or $env:COLORTERM -or $env:ConEmuANSI) -or (Enable-AnsiColors)

$Word      = "PHYSICS LAB 3D"
$LogoRows  = 0..4 | ForEach-Object { $r = $_; ($Word.ToCharArray() | ForEach-Object { $Glyphs[[string]$_][$r] + " " }) -join "" }
$LogoWidth = $LogoRows[0].Length
$LetterEnds = @(); $acc = 0
foreach ($ch in $Word.ToCharArray()) { $acc += $Glyphs[[string]$ch][0].Length + 1; $LetterEnds += $acc }
$IntroDone = $false

$History = New-Object System.Collections.Generic.List[object]
$Round   = 0

function Add-History([string]$Text, [string]$Color = "Gray") {
    $History.Add([pscustomobject]@{ Time = (Get-Date -Format "HH:mm:ss"); Text = $Text; Color = $Color })
}

function Get-Gradient([double]$T, [double]$Bright = 1.0) {
    $T = $T - [math]::Floor($T)
    $seg = $T * ($Palette.Count - 1)
    $i = [int][math]::Floor($seg)
    $f = $seg - $i
    $a = $Palette[$i]; $b = $Palette[$i + 1]
    return @(0..2 | ForEach-Object { [int](($a[$_] + ($b[$_] - $a[$_]) * $f) * $Bright) })
}

function Get-Fg($Rgb) { return "$Esc[38;2;$($Rgb[0]);$($Rgb[1]);$($Rgb[2])m" }

function Get-StarsLine {
    $chars = @('.', [string][char]0x00B7, '*', '+', [string][char]0x00B0)
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append("  ")
    for ($c = 0; $c -le $LogoWidth; $c++) {
        if ((Get-Random -Maximum 100) -lt 9) {
            $rgb = Get-Gradient ((Get-Random -Maximum 100) / 100.0) ((Get-Random -Minimum 45 -Maximum 100) / 100.0)
            [void]$sb.Append((Get-Fg $rgb) + ($chars | Get-Random))
        } else { [void]$sb.Append(" ") }
    }
    [void]$sb.Append("$Esc[0m")
    return $sb.ToString()
}

function Write-Stars { Write-Host (Get-StarsLine) }

function Write-LogoGradient([double]$Phase, [int]$MaxCol) {
    $block = [char]0x2588; $shade = [char]0x2591
    $shadowColor = Get-Fg @(55, 45, 95)
    for ($r = 0; $r -le 5; $r++) {
        $sb = New-Object System.Text.StringBuilder
        [void]$sb.Append("  ")
        for ($c = 0; $c -le $LogoWidth; $c++) {
            $main = ($r -lt 5) -and ($c -lt $LogoWidth) -and ($c -lt $MaxCol) -and ($LogoRows[$r][$c] -eq 'X')
            $shadow = (-not $main) -and ($r -ge 1) -and ($c -ge 1) -and (($c - 1) -lt $MaxCol) -and (($c - 1) -lt $LogoWidth) -and ($r -le 5) -and ($LogoRows[$r - 1][$c - 1] -eq 'X')
            if ($main) {
                $rgb = Get-Gradient (($c / [double]$LogoWidth) * 0.8 + $Phase) (1.0 - $r * 0.07)
                [void]$sb.Append((Get-Fg $rgb) + $block)
            } elseif ($shadow) {
                [void]$sb.Append($shadowColor + $shade)
            } else { [void]$sb.Append(" ") }
        }
        [void]$sb.Append("$Esc[0m")
        Write-Host $sb.ToString()
    }
}

function Write-Orbit([int]$Round, [int]$Frame = 0) {
    $width = $LogoWidth + 1
    $pos = ($Round * 7 + $Frame * 2) % $width
    $line = Get-Fg @(70, 60, 110)
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append("  " + $line)
    for ($c = 0; $c -lt $width; $c++) {
        if ($c -eq $pos) {
            [void]$sb.Append((Get-Fg (Get-Gradient ($Round * 0.17 + 0.3 + $Frame * 0.012))) + [string][char]0x25CF + $line)
        } elseif ($c -eq $pos - 1 -or $c -eq $pos - 2) {
            [void]$sb.Append([string][char]0x00B7)
        } else { [void]$sb.Append([string][char]0x2500) }
    }
    [void]$sb.Append("$Esc[0m")
    Write-Host $sb.ToString()
}

function Write-Tagline([int]$Frame) {
    $text = "  Movimiento, colisiones y graficas en 3D."
    $center = ($Frame * 0.7) % ($text.Length + 12) - 6
    $sb = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $text.Length; $i++) {
        $b = [math]::Max(0, 1 - [math]::Abs($i - $center) / 5)
        $rgb = @(0..2 | ForEach-Object { [int]((110, 110, 130)[$_] + ((235, 205, 255)[$_] - (110, 110, 130)[$_]) * $b) })
        [void]$sb.Append((Get-Fg $rgb) + $text[$i])
    }
    [void]$sb.Append("$Esc[0m")
    Write-Host $sb.ToString()
}

function Write-Logo([string]$Color) {
    $block = [string][char]0x2588
    foreach ($row in $LogoRows) { Write-Host ("  " + $row.Replace("X", $block)) -ForegroundColor $Color }
}

function Test-PortListening([int]$P) {
    return [bool](Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction SilentlyContinue)
}

function Test-ServerPort { return (Test-PortListening $WebPort) }

function Get-TrackedPid([string]$File) {
    if (-not (Test-Path $File)) { return $null }
    $saved = Get-Content $File -ErrorAction SilentlyContinue
    if ($saved -and (Get-Process -Id $saved -ErrorAction SilentlyContinue)) { return [int]$saved }
    return $null
}

function Start-One([string]$Name, [string]$Exe, [string[]]$ProcArgs, [string]$Dir, [string]$PidFile, [int]$P) {
    if ((Get-TrackedPid $PidFile) -or (Test-PortListening $P)) {
        Add-History "$Name ya estaba corriendo (puerto $P)" "Yellow"
        return
    }
    $proc = Start-Process -FilePath $Exe -ArgumentList $ProcArgs -WorkingDirectory $Dir -WindowStyle Minimized -PassThru
    $proc.Id | Out-File -FilePath $PidFile -Encoding ascii
    Add-History "$Name lanzado (PID $($proc.Id))" "Cyan"
}

function Start-DevServer {
    Start-One "Web (Vite)" "npm.cmd" @("run", "dev", "--", "--port", "$WebPort", "--strictPort") `
        $ProjectPath $ServerPidFile $WebPort

    Write-Host "  Esperando al servidor..." -ForegroundColor DarkGray
    $deadline = (Get-Date).AddSeconds($ReadyTimeoutS)
    while (-not (Test-ServerPort) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 400 }

    if (Test-PortListening $WebPort) { Add-History "PhysicsLab lista en $Url" "Green" } else { Add-History "El servidor no respondio en $ReadyTimeoutS s" "Red" }
}

function Open-Index {
    Start-Process -FilePath $Url -ErrorAction SilentlyContinue
    Add-History "PhysicsLab abierta en $Url" "Green"
}

function Stop-One([string]$PidFile, [int]$P) {
    $stopped = $false
    if (Test-Path $PidFile) {
        $savedPid = Get-Content $PidFile -ErrorAction SilentlyContinue
        if ($savedPid) {
            Get-CimInstance Win32_Process -Filter "ParentProcessId=$savedPid" -ErrorAction SilentlyContinue |
                ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            Stop-Process -Id $savedPid -Force -ErrorAction SilentlyContinue
            $stopped = $true
        }
        Remove-Item $PidFile -ErrorAction SilentlyContinue
    }
    try {
        Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; $stopped = $true }
    } catch {}
    return $stopped
}

function Stop-DevServer {
    if (Stop-One $ServerPidFile $WebPort) { Add-History "Servidor cerrado" "Green" }
    else { Add-History "No habia nada corriendo en $WebPort" "Yellow" }
}

function Invoke-Tests {
    Write-Host ""
    Push-Location $ProjectPath
    try { & npm.cmd test 2>&1 | ForEach-Object { Write-Host "  $_" } } finally { Pop-Location }
    if ($LASTEXITCODE -eq 0) { Add-History "Pruebas OK" "Green" } else { Add-History "Pruebas con fallos" "Red" }
    Write-Host ""
    [void](Read-Host "  Enter para volver al panel")
}

function Show-Menu([string]$Color, [int]$Round) {
    Clear-Host
    if ($UseTrueColor) {
        Write-Stars
        $logoTop = $null
        try { $logoTop = [Console]::CursorTop } catch {}
        $script:HeaderTop = if ($null -ne $logoTop) { $logoTop - 1 } else { $null }
        if (-not $script:IntroDone -and $null -ne $logoTop) {

            foreach ($end in $LetterEnds) {
                try { [Console]::SetCursorPosition(0, $logoTop) } catch { break }
                Write-LogoGradient ($Round * 0.17) $end
                Start-Sleep -Milliseconds 70
            }
        } else {
            Write-LogoGradient ($Round * 0.17) $LogoWidth
        }
        $script:IntroDone = $true
        Write-Stars
        Write-Orbit $Round
        Write-Tagline 0
    } else {
        Write-Logo $Color
        Write-Host ""
    }
    Write-Host ""
    Write-Host "  PhysicsLab 3D  -  $Url" -ForegroundColor DarkGray
    Write-Host "  ---------------------------------------------" -ForegroundColor DarkGray
    Write-Host "   1. Iniciar y abrir"
    Write-Host "   2. Reiniciar y reabrir"
    Write-Host "   3. Cerrar servidor"
    Write-Host "   4. Ejecutar pruebas"
    Write-Host "   5. Salir"
    Write-Host "  ---------------------------------------------" -ForegroundColor DarkGray
}

$FixedRows = 23

function Get-VisibleHistory {
    $rows = $HistoryLimit
    try { $rows = [math]::Min($HistoryLimit, [Console]::WindowHeight - $FixedRows) } catch {}
    return [math]::Max(3, $rows)
}

function Show-History([string]$Color, [int]$Max) {
    $lines = 2
    Write-Host ""
    Write-Host "  Historial" -ForegroundColor $Color
    if ($History.Count -eq 0) {
        Write-Host "   (sin acciones todavía)" -ForegroundColor DarkGray
        return $lines + 1
    }
    $recent = @($History | Select-Object -Last $Max)
    [array]::Reverse($recent)
    foreach ($entry in $recent) {
        Write-Host ("   {0}  {1}" -f $entry.Time, $entry.Text) -ForegroundColor $entry.Color
        $lines++
    }
    return $lines
}

function Update-Header([int]$Round, [int]$Frame, [string]$StarsA, [string]$StarsB) {
    [Console]::SetCursorPosition(0, $script:HeaderTop)
    Write-Host $StarsA
    Write-LogoGradient ($Round * 0.17 + $Frame * 0.012) $LogoWidth
    Write-Host $StarsB
    Write-Orbit $Round $Frame
    Write-Tagline $Frame
}

function Read-Choice([string]$Color, [int]$Round) {
    if (-not $UseTrueColor -or $null -eq $script:HeaderTop) {
        [void](Show-History $Color $HistoryLimit)
        return Read-Host "  Elige una opción (1-5)"
    }
    $printed = Show-History $Color (Get-VisibleHistory)
    [Console]::Write("$Esc[$($printed)A$Esc[1G")
    [Console]::Write("  Elige una opción (1-5): ")
    $left = [Console]::CursorLeft; $top = [Console]::CursorTop
    $buf = ""; $frame = 0
    $starsA = Get-StarsLine; $starsB = Get-StarsLine
    try {
        [Console]::CursorVisible = $false
        while ($true) {
            while ([Console]::KeyAvailable) {
                $k = [Console]::ReadKey($true)
                if ($k.Key -eq 'Enter') { return $buf }
                elseif ($k.Key -eq 'Backspace') { if ($buf.Length -gt 0) { $buf = $buf.Substring(0, $buf.Length - 1) } }
                elseif ($k.KeyChar -ge ' ' -and $buf.Length -lt 3) { $buf += $k.KeyChar }
            }
            if ($frame % 6 -eq 0) { if (($frame / 6) % 2 -eq 0) { $starsA = Get-StarsLine } else { $starsB = Get-StarsLine } }
            Update-Header $Round $frame $starsA $starsB
            [Console]::SetCursorPosition($left, $top)
            [Console]::Write($buf + "   ")
            [Console]::SetCursorPosition($left + $buf.Length, $top)
            $frame++
            Start-Sleep -Milliseconds 70
        }
    } finally { [Console]::CursorVisible = $true }
}

Add-History "Panel iniciado" "DarkGray"
do {
    $color = $LogoColors[$Round % $LogoColors.Count]
    Show-Menu $color $Round
    $choice = Read-Choice $color $Round
    $Round++
    switch ($choice) {
        "1" { Add-History "[1] Iniciar y abrir" "Cyan"; Start-DevServer; if (Test-ServerPort) { Open-Index } }
        "2" { Add-History "[2] Reiniciar y reabrir" "Cyan"; Stop-DevServer; Start-DevServer; if (Test-ServerPort) { Open-Index } }
        "3" { Add-History "[3] Cerrar servidor" "Cyan"; Stop-DevServer }
        "4" { Add-History "[4] Ejecutar pruebas" "Cyan"; Invoke-Tests }
        "5" { Add-History "[5] Salir" "Cyan" }
        default { Add-History "Opción no válida: '$choice'" "Red" }
    }
} while ($choice -ne "5")

Write-Host ""
Write-Host "  Hasta pronto." -ForegroundColor DarkGray
