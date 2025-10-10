import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './telegramViewport.js'
import App from './App.jsx'
import { TelegramProvider } from './providers/TelegramProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
	<TelegramProvider>
		<App />
	</TelegramProvider>
)
