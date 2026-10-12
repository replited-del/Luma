(function(root) {
  'use strict';
  // Only UI source strings are translated. Track metadata and playlist names
  // are interpolated separately and never passed through this dictionary.
  const english = {
    'Визуализация музыки':'Music visualization', 'Спектр, громкость и бас во время воспроизведения':'Spectrum, volume and bass during playback',
    'Спектр музыки':'Music spectrum', 'Громкость музыки':'Music volume', 'Уровень баса':'Bass level', 'Бас':'Bass',
    'ВАШЕ ПРОСТРАНСТВО':'YOUR SPACE', 'Главная':'Home', 'Все треки':'All tracks', 'Альбомы':'Albums', 'Любимые':'Favorites',
    'ПЛЕЙЛИСТЫ':'PLAYLISTS', 'Локальная библиотека':'Local library', 'Настройки':'Settings', 'Ваша музыка. Ваш ритм.':'Your music. Your rhythm.',
    'Поиск в вашей музыке':'Search your music', 'Поиск музыки':'Search music', 'Очистить поиск':'Clear search', 'Назад':'Back',
    'Добавить музыку':'Add music', 'Добавить папку с музыкой':'Add a music folder', 'Музыка':'Music', 'Закрыть':'Close', 'Свернуть':'Minimize', 'Развернуть':'Maximize', 'Восстановить окно':'Restore window',
    'Создать плейлист':'Create playlist', 'Открыть плеер':'Open player', 'Выберите свой первый трек':'Choose your first track', 'Музыка начинается с вас':'Music starts with you',
    'Добавить в любимые':'Add to favorites', 'В любимые':'Add to favorites', 'Убрать из любимых':'Remove from favorites', 'Перемешать':'Shuffle', 'Предыдущий трек':'Previous track',
    'Воспроизвести':'Play', 'Следующий трек':'Next track', 'Повтор выключен':'Repeat off', 'Повтор очереди':'Repeat queue', 'Повтор трека':'Repeat track', 'Повтор':'Repeat',
    'Позиция воспроизведения':'Playback position', 'Эквалайзер':'Equalizer', 'Очередь':'Queue', 'Выключить звук':'Mute', 'Включить звук':'Unmute', 'Громкость':'Volume',
    'Отпустите музыку здесь':'Drop your music here', 'Файлы и папки — всё останется на вашем ПК':'Files and folders — everything stays on your PC',
    'Не удалось сохранить настройки':'Could not save settings', 'Соберите музыку':'Collect your music', 'под своё настроение':'for every mood',
    'НАЗВАНИЕ':'TITLE', 'АЛЬБОМ':'ALBUM', 'ВРЕМЯ':'TIME', 'Действия с треком':'Track actions', 'Открыть библиотеку':'Open library', 'Выбрать треки':'Choose tracks',
    'Музыка этой ночи':'Music for tonight', 'Доброе утро':'Good morning', 'Хорошего дня':'Good afternoon', 'Добрый вечер':'Good evening',
    'МУЗЫКА РЯДОМ':'MUSIC WITH YOU', 'Ваш маленький музыкальный мир':'Your personal music space', 'ТОЛЬКО ВАША КОЛЛЕКЦИЯ':'YOUR COLLECTION, YOUR RULES', 'НАЧНИТЕ С ЛЮБИМОГО':'START WITH WHAT YOU LOVE',
    'Всё, что звучит':'Everything that sounds', 'как вы.':'like you.', 'Ваша музыка.':'Your music.', 'Без лишнего.':'Nothing extra.',
    'в одном месте. Нажмите play —':'in one place. Press play —', 'и пусть остальной мир подождёт.':'and let the world wait.', 'Перенесите сюда любимые треки.':'Bring your favorite tracks here.', 'Остальное мы уже настроили для вас.':'We have taken care of the rest.',
    'Слушать музыку':'Play music', 'Выбрать папку':'Choose folder', 'Недавно звучало':'Recently played', 'Вся история':'Full history', 'В вашей коллекции':'In your collection',
    'Под любой момент':'For every moment', 'Создайте свой первый плейлист':'Create your first playlist', 'Тихий вечер':'Quiet evening', 'Когда хочется замедлиться':'When you want to slow down',
    'Самое любимое':'All-time favorites', 'Треки, к которым возвращаетесь':'Tracks you keep coming back to', 'В своём ритме':'Your own rhythm', 'Для дел и хороших идей':'For focus and good ideas', 'В дороге':'On the road', 'Ваш личный саундтрек':'Your personal soundtrack',
    'Ваша коллекция':'Your collection', 'Пока здесь тихо':'Quiet for now', 'Перетащите сюда музыку или':'Drop music here or', 'выберите файлы':'choose files',
    'ВАША БИБЛИОТЕКА':'YOUR LIBRARY', 'Результаты поиска':'Search results', 'Поиск':'Search', 'Альбом':'Album', 'Плейлист':'Playlist', 'в коллекции':'in your collection',
    'Каждый альбом — целая история':'Every album tells a story', 'Добавьте музыку, и альбомы появятся здесь автоматически.':'Add music and your albums will appear here automatically.',
    'НАЙДЁТСЯ ТОТ САМЫЙ ТРЕК':'FIND THAT PERFECT TRACK', 'ВАШ ПЛЕЙЛИСТ':'YOUR PLAYLIST', 'Слушать':'Play', 'Добавить треки':'Add tracks', 'Переименовать':'Rename', 'Удалить плейлист':'Delete playlist',
    'Все':'All', 'Сортировка':'Sort', 'Сначала новые':'Newest first', 'По названию':'By title', 'По исполнителю':'By artist',
    'Пока ничего не нашлось':'No results yet', 'Попробуйте другое название, исполнителя или альбом.':'Try another title, artist or album.',
    'Самое любимое — здесь':'Your favorites belong here', 'Нажмите на сердечко рядом с треком, чтобы добавить его в любимые.':'Click the heart next to a track to save it to your favorites.',
    'У этого плейлиста всё впереди':'This playlist is just getting started', 'Выберите музыку из вашей библиотеки.':'Choose music from your library.',
    'Таких треков пока нет':'No matching tracks yet', 'Попробуйте другой фильтр.':'Try another filter.', 'Начнём вашу коллекцию':'Start your collection',
    'Добавьте любимую музыку с компьютера. Мы прочитаем обложки и аккуратно разложим альбомы.':'Add music from your computer. We will read the artwork and organize your albums.',
    'Не удалось воспроизвести этот файл. Проверьте формат и добавьте его заново.':'Could not play this file. Check the format and import it again.', 'Не удалось начать воспроизведение':'Could not start playback', 'Пауза':'Pause',
    'Закрыть очередь':'Close queue', 'В случайном порядке':'In shuffled order', 'Включите трек — и очередь появится здесь.':'Play a track to see your queue here.',
    'Новая музыка — новый момент':'New music, a new moment', 'Добавьте файлы или целую папку.':'Add files or an entire folder.', 'Оригиналы останутся на своих местах.':'Your originals stay where they are.',
    'Выбрать файлы':'Choose files', 'Один трек или сразу несколько':'One track or several at once', 'Добавить папку':'Add folder', 'Включая все вложенные папки':'Including all subfolders',
    'Без загрузки в облако. Без подписки. Без рекламы.':'No cloud uploads. No subscription. No ads.', 'В папке не найдено поддерживаемой музыки':'No supported audio files found',
    'Добавлено:':'Added:', 'Уже в библиотеке:':'Already in library:', 'Не прочитано:':'Could not read:', 'Добавляем':'Importing', 'из':'of',
    'Переименовать плейлист':'Rename playlist', 'Дайте название своему настроению.':'Give your mood a name.', 'Например, Ночные прогулки':'For example, Night walks', 'Отмена':'Cancel', 'Сохранить':'Save',
    'Добавить в плейлист':'Add to playlist', 'выберите треки':'choose tracks', 'Сохранить выбор':'Save selection', 'Плейлист обновлён':'Playlist updated',
    'Звук под вас':'Your sound, your way', '10-полосный эквалайзер':'10-band equalizer', 'Включить эквалайзер':'Enable equalizer', 'Пресет':'Preset', 'Свой звук':'Custom', 'Ровный':'Flat', 'Больше баса':'Bass boost', 'Вокал':'Vocal', 'Рок':'Rock', 'Мягкий':'Soft', 'Гц':'Hz',
    'Изменения слышны сразу и сохраняются автоматически.':'Changes apply instantly and save automatically.',
    'Немного деталей, чтобы Luma ощущалась вашей.':'Make Luma feel right for you.', 'Компактная библиотека':'Compact library', 'Больше треков помещается на экране':'Fit more tracks on your screen',
    'Меньше анимаций':'Reduce motion', 'Спокойный интерфейс без движения':'A calm interface without animations', 'Всё хранится на вашем ПК':'Everything stays on your PC',
    'Музыка копируется в библиотеку приложения.':'Music is copied to the app library.', 'Аккаунт и интернет для прослушивания не нужны.':'No account or internet needed to listen.', 'Сделано для вашей музыки':'Made for your music',
    'Пробел — play / pause':'Space — play / pause', 'поиск':'search', 'импорт':'import', 'следующий / предыдущий трек':'next / previous track',
    'Сейчас звучит':'Now playing', 'Добавить в очередь':'Add to queue', 'ДОБАВИТЬ В ПЛЕЙЛИСТ':'ADD TO PLAYLIST', 'Новый плейлист':'New playlist', 'Убрать из плейлиста':'Remove from playlist', 'Убрать из библиотеки':'Remove from library',
    'Удалить плейлист?':'Delete playlist?', 'будет удалён. Музыка останется в библиотеке.':'will be deleted. Your music will stay in the library.', 'Удалить':'Delete', 'Трек добавлен в очередь':'Added to queue', 'Добавлено в плейлист':'Added to playlist',
    'Убрать трек из библиотеки?':'Remove track from library?', 'исчезнет из библиотеки и плейлистов. Исходный файл останется на месте.':'will be removed from your library and playlists. The original file will stay where it is.', 'Убрать':'Remove',
    'Не удалось сохранить изменение. Попробуйте ещё раз.':'Could not save the change. Please try again.', 'Этот файл не воспроизводится. Возможно, кодек не поддерживается.':'This file cannot be played. Its codec may not be supported.', 'Не удалось прочитать библиотеку':'Could not read the library',
    'Неизвестный исполнитель':'Unknown artist', 'Без альбома':'No album', 'Импорт уже идёт. Дождитесь завершения.':'An import is already running. Please wait.', 'Некорректный список файлов':'Invalid file list', 'Введите название':'Enter a name', 'Плейлист не найден':'Playlist not found',
    'Оформление окна':'Window style', 'Обычные кнопки Windows или цветные кнопки macOS':'Standard Windows buttons or colorful macOS controls', 'Язык интерфейса':'Interface language', 'Меняется сразу, без перезапуска':'Applies instantly, no restart needed',
    'Воспроизведение одним нажатием':'Play with one click', 'Нажмите на трек, чтобы слушать. Сердечко — в любимые.':'Click a track to play it. Use the heart to save it.',
    'Быстрые действия':'Quick actions', 'Добавить файлы':'Add files', 'Создать':'Create', 'Вся музыка':'All music', 'На весь экран':'Expand player',
    'Стиль и язык сохраняются автоматически':'Style and language save automatically', 'Назад к музыке':'Back to music', 'Настроить интерфейс':'Customize interface',
    'Русский':'Russian', 'Интерфейс':'Appearance', 'Звук и удобство':'Sound and comfort', 'Горячие клавиши':'Keyboard shortcuts',
    'выберите':'choose', 'ваша музыка':'your music'
  };
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(english).sort((a,b) => b.length-a.length);
  const pattern = new RegExp(keys.map(key => `${/^[\p{L}\p{N}_]/u.test(key)?'(?<![\\p{L}\\p{N}_])':''}${escape(key)}${/[\p{L}\p{N}_]$/u.test(key)?'(?![\\p{L}\\p{N}_])':''}`).join('|'), 'gu');
  function translate(text, language = 'ru') {
    if (language !== 'en') return String(text);
    return String(text).replace(pattern, match => english[match]);
  }
  const api = { translate, english };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LumaI18n = api;
})(typeof window !== 'undefined' ? window : globalThis);
