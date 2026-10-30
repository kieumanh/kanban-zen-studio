!include "MUI2.nsh"
Name "${PRODUCT_NAME}"
SetCompressor zlib
SetCompress auto
InstallDir "$LOCALAPPDATA\Programs\Kanban Zen Studio"
InstallDirRegKey HKCU "Software\KanbanZenStudio" "InstallDir"
RequestExecutionLevel user
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Section "Install"
 SetOutPath "$INSTDIR"
 File /r "${PROJECT_DIR}/release/windows/win-unpacked/*"
 WriteUninstaller "$INSTDIR\Uninstall.exe"
 WriteRegStr HKCU "Software\KanbanZenStudio" "InstallDir" "$INSTDIR"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "DisplayName" "${PRODUCT_NAME}"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "DisplayVersion" "${VERSION}"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}" "UninstallString" '$"$INSTDIR\Uninstall.exe$"'
 CreateDirectory "$SMPROGRAMS\Kanban Zen Studio"
 CreateShortcut "$SMPROGRAMS\Kanban Zen Studio\Kanban Zen Studio.lnk" "$INSTDIR\Kanban Zen Studio.exe"
 CreateShortcut "$DESKTOP\Kanban Zen Studio.lnk" "$INSTDIR\Kanban Zen Studio.exe"
SectionEnd
Section "Uninstall"
 Delete "$DESKTOP\Kanban Zen Studio.lnk"
 Delete "$SMPROGRAMS\Kanban Zen Studio\Kanban Zen Studio.lnk"
 RMDir "$SMPROGRAMS\Kanban Zen Studio"
 DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}"
 DeleteRegKey HKCU "Software\KanbanZenStudio"
 ; Only installed program files are removed. User workspace and IndexedDB remain intact.
 !include "${PROJECT_DIR}/release/windows/uninstall-files.nsh"
SectionEnd
