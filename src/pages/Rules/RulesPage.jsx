import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function RulesPage() {
  const navigate = useNavigate()
  const [lang, setLang] = useState('en') // 'en' | 'ru'

  const t = (key) => {
    const dict = {
      en: {
        title: 'How to play',
        back: 'Back',
        basics: 'Basics',
        basicsItems: [
          'Choose gifts (your stake) and create a battle or join one.',
          'Each game is 1v1. You and your opponent hide 1 gift on a 4x4 grid.',
          'Take turns to guess the opponent’s cell. Hit to win the round.',
        ],
        timing: 'Timing',
        timingItems: [
          'Placing phase: limited time to pick your secret cell.',
          'Turns: 25 seconds per move, +3 seconds bonus for each move.',
          'If you disconnect, you have ~30 seconds to reconnect.',
        ],
        stakes: 'Stakes and rewards',
        stakesItems: [
          'You must stake gifts to create or join a battle.',
          'Winner receives the opponent’s staked gifts.',
          'Commission: 0.4 TON per game.',
        ],
        fair: 'Fair play',
        fairItems: [
          'One device per player: if you connect from another device, old sessions are disconnected.',
          'Session expires after inactivity. Stay active during your games.',
        ],
        notes: 'Notes',
        notesItems: [
          'Names and labels are subject to change.',
          'Rules may update; watch for in-app notices.',
        ],
      },
      ru: {
        title: 'Как играть',
        back: 'Назад',
        basics: 'Основы',
        basicsItems: [
          'Выберите подарки (ваша ставка) и создайте битву или присоединитесь к готовой.',
          'Игра 1 на 1. Вы и соперник прячете по 1 подарку на поле 4×4.',
          'Ходы по очереди: угадывайте ячейку соперника. Попал — раунд за вами.',
        ],
        timing: 'Тайминги',
        timingItems: [
          'Фаза размещения: ограниченное время на выбор секретной клетки.',
          'Ход: 25 секунд на действие, за каждый ход +3 секунды бонус.',
          'При разрыве соединения есть ~30 секунд на переподключение.',
        ],
        stakes: 'Ставки и награды',
        stakesItems: [
          'Чтобы создать/войти в битву, нужно поставить подарки.',
          'Победитель получает поставленные соперником подарки.',
          'Комиссия: 0.4 TON за игру.',
        ],
        fair: 'Честная игра',
        fairItems: [
          'Одно устройство на игрока: при входе с другого устройства прежняя сессия отключается.',
          'Сессия истекает при неактивности — будьте активны во время игры.',
        ],
        notes: 'Примечания',
        notesItems: [
          'Названия и подписи могут меняться.',
          'Правила обновляются — следите за уведомлениями в приложении.',
        ],
      },
    }
    const d = dict[lang]
    return d[key]
  }

  return (
    <div className="max-w-[390px] w-full mx-auto text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          {/* Local RU/EN switch only for Rules */}
          <div className="h-8 p-0.5 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center">
            <button
              onClick={() => setLang('en')}
              className={[
                'px-2 h-7 rounded-md text-xs',
                lang === 'en' ? 'bg-neutral-700 text-white' : 'text-white/70'
              ].join(' ')}
              aria-pressed={lang === 'en'}
              type="button"
            >EN</button>
            <button
              onClick={() => setLang('ru')}
              className={[
                'px-2 h-7 rounded-md text-xs',
                lang === 'ru' ? 'bg-neutral-700 text-white' : 'text-white/70'
              ].join(' ')}
              aria-pressed={lang === 'ru'}
              type="button"
            >RU</button>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          >{t('back')}</button>
        </div>
      </div>

      <div className="space-y-4 text-sm text-neutral-200">
        <RuleCard title={t('basics')} icon="🎯" items={t('basicsItems')} />
        <RuleCard title={t('timing')} icon="⏱️" items={t('timingItems')} />
        <RuleCard title={t('stakes')} icon="🏆" items={t('stakesItems')} />
        <RuleCard title={t('fair')} icon="🤝" items={t('fairItems')} />
        <RuleCard title={t('notes')} icon="📝" items={t('notesItems')} />
      </div>
    </div>
  )
}

function RuleCard({ title, items = [], icon }) {
  return (
    <section className="p-3 rounded-xl bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,_#222222_0%,_#111111_100%)] border border-neutral-700/60 overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-lg" aria-hidden>{icon}</span>}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <ul className="list-disc pl-5 space-y-1">
        {Array.isArray(items) && items.map((line, idx) => (
          <li key={idx}>{line}</li>
        ))}
      </ul>
    </section>
  )
}
