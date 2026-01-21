@echo off
setlocal EnableDelayedExpansion

:: ============================================
:: Git Push Script for Windows
:: Usage: git-push.bat "commit message"
:: ============================================

echo.
echo ========================================
echo    Git Push - Beauty Salon
echo ========================================
echo.

:: Check if commit message is provided
if "%~1"=="" (
    set /p COMMIT_MSG="Enter commit message: "
) else (
    set "COMMIT_MSG=%~1"
)

if "!COMMIT_MSG!"=="" (
    echo [ERROR] Commit message cannot be empty!
    pause
    exit /b 1
)

:: Add all changes
echo.
echo [1/3] Adding files...
git add .

:: Check if there's something to commit
git diff --cached --quiet
if %errorlevel%==0 (
    echo.
    echo [INFO] No changes to commit.
    pause
    exit /b 0
)

:: Commit
echo.
echo [2/3] Creating commit: "!COMMIT_MSG!"
git commit -m "!COMMIT_MSG!"

:: Push
echo.
echo [3/3] Pushing to GitHub...
git push -u origin master

if %errorlevel%==0 (
    echo.
    echo ========================================
    echo    SUCCESS! Changes pushed.
    echo ========================================
) else (
    echo.
    echo [ERROR] Push failed.
    echo Try: git push -u origin master
)

echo.
pause
