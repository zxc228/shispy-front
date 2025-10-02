$ErrorActionPreference = "Stop"

$dirs = @(
  "src/app/providers",
  "src/pages/Map","src/pages/Live","src/pages/Lobby","src/pages/Treasure","src/pages/Profile",
  "src/pages/Battle","src/pages/CreateBattle","src/pages/JoinBattle","src/pages/Add",
  "src/components/layout","src/components/ui","src/components/widgets","src/components/icons",
  "src/features/telegram","src/features/auth","src/features/payments","src/features/promo",
  "src/services","src/hooks","src/styles","src/assets/fonts","src/assets/images/logos",
  "src/assets/images/placeholders","src/assets/tokens","src/constants","src/utils","src/__mocks__"
)
$files = @(
  ".env.example","postcss.config.js","tailwind.config.js","vite.config.js",
  "src/main.jsx","src/app/routes.jsx","src/app/providers/ThemeProvider.jsx","src/app/providers/UIProvider.jsx",
  "src/features/telegram/telegram.stub.js","src/features/telegram/useTelegram.stub.js",
  "src/services/api.stub.js",
  "src/hooks/useCountdown.js","src/hooks/useBottomNav.js","src/hooks/useKeyboardInput.js",
  "src/styles/index.css","src/styles/utilities.css",
  "src/assets/tokens/colors.json","src/assets/tokens/spacing.json",
  "src/constants/routes.js","src/constants/ton.js","src/constants/game.js",
  "src/utils/formatters.js","src/utils/cn.js","src/utils/guards.js"
)

foreach ($d in $dirs) { if (!(Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null } }

$pages = @("Map","Live","Lobby","Treasure","Profile","Battle","CreateBattle","JoinBattle","Add")
foreach ($p in $pages) {
  New-Item -ItemType File -Path "src/pages/$p/${p}Page.jsx" -Force | Out-Null
  $mock = $p.ToLower()
  New-Item -ItemType File -Path "src/pages/$p/$mock.mock.json" -Force | Out-Null
}

$more = @(
  "src/pages/Lobby/LobbyPrivateModal.jsx","src/pages/Treasure/TreasureAddModal.jsx","src/pages/Profile/PromoCodeSheet.jsx",
  "src/components/layout/AppLayout.jsx","src/components/layout/Header.jsx","src/components/layout/BottomNav.jsx",
  "src/components/ui/Button.jsx","src/components/ui/SegmentedTabs.jsx","src/components/ui/Card.jsx","src/components/ui/Modal.jsx",
  "src/components/ui/Sheet.jsx","src/components/ui/Input.jsx","src/components/ui/Keyboard.jsx","src/components/ui/ProgressBar.jsx",
  "src/components/ui/Toast.jsx",
  "src/components/widgets/BattleCard.jsx","src/components/widgets/InventoryGrid.jsx","src/components/widgets/HistoryList.jsx",
  "src/components/widgets/ReferralBlock.jsx","src/components/widgets/CompetitionBanner.jsx",
  "src/components/icons/map.svg","src/components/icons/live.svg","src/components/icons/lobby.svg",
  "src/components/icons/treasure.svg","src/components/icons/profile.svg",
  "src/__mocks__/server.js"
)
$files += $more

foreach ($f in $files) { if (!(Test-Path $f)) { New-Item -ItemType File -Path $f -Force | Out-Null } }

Write-Host "Scaffold complete ✅"
