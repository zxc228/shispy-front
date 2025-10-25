import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './telegramViewport.js'
import App from './App.jsx'
import { TelegramProvider } from './providers/TelegramProvider.jsx'
import { LoadingProvider } from './providers/LoadingProvider.jsx'
import { BalanceProvider } from './providers/BalanceProvider.jsx'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import TonConnectBridge from './features/tonconnect/TonConnectBridge.jsx'
import { GameSocketProvider } from './providers/GameSocketProvider.jsx'

const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`

ReactDOM.createRoot(document.getElementById('root')).render(
	<TonConnectUIProvider manifestUrl={manifestUrl}>
		<TelegramProvider>
			<LoadingProvider>
				<BalanceProvider>
					<GameSocketProvider>
					<TonConnectBridge />
					<App />
					</GameSocketProvider>
				</BalanceProvider>
			</LoadingProvider>
		</TelegramProvider>
	</TonConnectUIProvider>
)
