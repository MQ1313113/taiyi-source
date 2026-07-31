@echo off
setlocal enabledelayedexpansion
rem ============================================================================
rem  太一（TaiYi）研发管理平台 —— Windows 一键构建 / 运行脚本
rem  单产物：前端已内嵌进后端 jar，java -jar 一处启动，:8080 同时提供 API 与页面。
rem
rem  用法：
rem    deploy.bat build   构建（含前端，产出单 jar）
rem    deploy.bat run     构建（若无 jar）并前台运行
rem    deploy.bat deploy  构建 + 前台运行
rem    deploy.bat         等同 deploy
rem
rem  可覆盖：set SERVER_PORT=9090 & set JAVA_OPTS=-Xmx2g & deploy.bat run
rem ============================================================================
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "SERVICE_DIR=%BACKEND_DIR%\rd-platform-service"
if not defined SERVER_PORT set "SERVER_PORT=8080"
if not defined JAVA_OPTS set "JAVA_OPTS=-Xms512m -Xmx1024m"

set "CMD=%~1"
if "%CMD%"=="" set "CMD=deploy"

if /I "%CMD%"=="build"  goto :build
if /I "%CMD%"=="run"    goto :run
if /I "%CMD%"=="deploy" goto :deploy
echo 未知命令：%CMD%
echo 用法：deploy.bat [build^|run^|deploy]
exit /b 1

:build
echo ==^> 构建（含前端，打进单 jar）...
pushd "%BACKEND_DIR%"
call mvn -DskipTests clean package
set "ERR=%ERRORLEVEL%"
popd
if not "%ERR%"=="0" ( echo !! 构建失败 & exit /b %ERR% )
echo ==^> 构建完成
exit /b 0

:deploy
call :build || exit /b 1
goto :run

:run
call :findjar
if not defined JAR (
  call :build || exit /b 1
  call :findjar
)
if not defined JAR ( echo !! 未找到 jar & exit /b 1 )
echo ==^> 前台运行 :%SERVER_PORT% （Ctrl+C 退出）
echo     访问：http://localhost:%SERVER_PORT%
java %JAVA_OPTS% -Dserver.port=%SERVER_PORT% -jar "%JAR%"
exit /b %ERRORLEVEL%

:findjar
set "JAR="
for /f "delims=" %%i in ('dir /b /s "%SERVICE_DIR%\target\rd-platform-service-*.jar" 2^>nul ^| findstr /v /i ".original"') do (
  if not defined JAR set "JAR=%%i"
)
exit /b 0