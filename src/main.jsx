import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './telegramViewport.js'
import App from './App.jsx'
import { TelegramProvider } from './providers/TelegramProvider.jsx'
import { LoadingProvider } from './providers/LoadingProvider.jsx'
import { BalanceProvider } from './providers/BalanceProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
	<TelegramProvider>
		<LoadingProvider>
			<BalanceProvider>
				<App />
			</BalanceProvider>
		</LoadingProvider>
	</TelegramProvider>
)
