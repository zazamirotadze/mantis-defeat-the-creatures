// ==========================================
// Bilingual Localization System (i18n)
// English (default) & Georgian
// ==========================================

const I18N = {
  current: 'en',
  listeners: [],

  init() {
    try {
      const saved = localStorage.getItem('mantis_language');
      if (saved === 'en' || saved === 'ka') {
        this.current = saved;
      } else {
        this.current = 'en';
      }
    } catch (e) {
      this.current = 'en';
    }
  },

  onChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  },

  setLanguage(lang) {
    if (lang !== 'en' && lang !== 'ka') return;
    this.current = lang;
    try {
      localStorage.setItem('mantis_language', lang);
    } catch (e) {}

    document.documentElement.lang = lang;
    document.title = this.t('page_title');

    this.listeners.forEach(cb => {
      try { cb(lang); } catch (err) { console.error(err); }
    });
  },

  t(key, params = {}) {
    const dict = this.translations[this.current] || this.translations.en;
    let val = dict[key] || this.translations.en[key] || key;
    if (typeof val === 'string') {
      Object.keys(params).forEach(k => {
        val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return val;
  },

  getCreatureName(c) {
    if (!c) return '';
    if (this.current === 'ka') {
      return c.georgianName || c.nameKa || c.name;
    }
    return c.nameEn || c.name;
  },

  getCreatureLore(c) {
    if (!c) return '';
    if (this.current === 'ka') {
      return c.loreKa || c.lore || '';
    }
    return c.loreEn || c.lore || '';
  },

  getCreatureTip(c) {
    if (!c) return '';
    if (this.current === 'ka') {
      return c.tipKa || c.tip || '';
    }
    return c.tipEn || c.tip || '';
  },

  getPaletteName(palette) {
    if (!palette) return '';
    if (this.current === 'ka') {
      return palette.nameKa || palette.name;
    }
    return palette.nameEn || palette.name;
  },

  translations: {
    en: {
      page_title: 'Mantis: Defeat the Creatures',
      mantis_name: 'MANTIS',
      mantis_hero_title: 'MANTIS',
      stage_badge: 'STAGE {current} / {total}',
      
      // Controls hint
      controls_move: 'Move',
      controls_jump: 'Jump',
      controls_slash: 'Slash',
      controls_pounce: 'Pounce',
      controls_block: 'Block',

      // HUD Buttons
      btn_settings: '⚙️ Settings',
      btn_settings_title: 'Settings',
      btn_menu: '🏠 Menu',
      btn_menu_title: 'Return to Main Menu',

      // Start Screen
      game_subtitle: 'DEFEAT THE CREATURES',
      start_intro: 'Control the Praying Mantis, wield deadly raptorial forelegs, and conquer 8 challenging stages against the unique biological fighting styles of real creatures!',
      btn_start: 'START GAME',
      stages_label: '🗺️ STAGES',
      stage_start_tooltip: '{stage}. Start Stage',
      stage_locked_tooltip: 'Defeat {prevCreature} first',
      progress_all_unlocked: 'All stages unlocked.',
      progress_some_unlocked: 'Unlocked {unlocked} / {total} stages — next unlocks after victory.',
      btn_epilogue: '📖 EPILOGUE',
      btn_settings_start: '⚙️ SETTINGS',

      // Settings Modal
      settings_title: 'SETTINGS',
      settings_subtitle: 'Mantis customization, audio, and language options',
      settings_lang_label: '🌐 LANGUAGE',
      settings_color_label: '🦗 MANTIS COLOR',
      settings_audio_label: '🔊 AUDIO CONTROLS',
      sfx_label_on: 'Sound Effects: ON',
      sfx_label_off: 'Sound Effects: OFF',
      bgm_label_on: 'Music: ON',
      bgm_label_off: 'Music: OFF',
      btn_save_settings: 'Save & Return',

      // Epilogue Modal
      epilogue_title: 'EPILOGUE',
      epilogue_kicker: 'Chronicle of the Mantis',
      epilogue_p1: 'After eight fierce battles, quiet descended upon the forest once more. The Mantis vanquished every adversary — from camouflaged grasshoppers to the predatory hornet and the serpent.',
      epilogue_p2: 'Yet triumph was not solely born of ferocity. The Mantis deciphered the wing cadence, posture, and defensive reflexes of each beast, preserving nature’s equilibrium.',
      epilogue_p3: 'At daybreak, the wild dwellers retreated to their habitats, while the Mantis rested upon a solitary leaf — poised and watchful for whatever lies ahead.',
      epilogue_heading_starring: 'Starring',
      epilogue_name_mantis: 'The Praying Mantis',
      epilogue_heading_dwellers: 'Wild Adversaries',
      epilogue_name_dwellers: 'Grasshoppers • Tree Frog • Giant Hornet • Garter Snake',
      epilogue_final_line: 'Is this the end… or the dawn of a new hunt?',
      epilogue_the_end: 'THE END',
      btn_close_epilogue: 'Return to Menu',

      // Victory Modal
      victory_title: 'VICTORY!',
      victory_defeated: '{creature} has been defeated!',
      bio_card_heading: 'Biological Lore:',
      btn_next_stage: 'NEXT STAGE ➔',
      btn_replay_stage: 'RETRY',

      // Defeat Modal
      defeat_title: 'DEFEATED!',
      defeat_sub: 'The Mantis was defeated by {creature}...',
      tip_card_heading: 'Tactical Tip:',
      btn_retry: 'TRY AGAIN ↺',

      // Campaign Clear Modal
      clear_title: '🏆 CHAMPION!',
      clear_subtitle: 'Congratulations! You have conquered all creatures, including the serpent!',
      clear_card_heading: 'Mantis Triumph:',
      clear_card_body: 'The Praying Mantis has established itself as the apex predator of the wild! Demonstrating unmatched reflexes, stealth, patient parrying, and lethal precision, it overcame nature’s greatest rivals — from agile grasshoppers to the Asian giant hornet and the garter snake!',
      btn_play_again: 'PLAY AGAIN'
    },

    ka: {
      page_title: 'ჩოქელა: დაამარცხე არსებები | Mantis: Defeat the Creatures',
      mantis_name: 'ჩოქელა',
      mantis_hero_title: 'ჩოქელა',
      stage_badge: 'ტური {current} / {total}',

      // Controls hint
      controls_move: 'მოძრაობა',
      controls_jump: 'ნახტომი',
      controls_slash: 'ჭრა',
      controls_pounce: 'ჩასაფრება',
      controls_block: 'ბლოკი',

      // HUD Buttons
      btn_settings: '⚙️ პარამეტრები',
      btn_settings_title: 'პარამეტრები',
      btn_menu: '🏠 მენიუ',
      btn_menu_title: 'მთავარ მენიუში დაბრუნება',

      // Start Screen
      game_subtitle: 'დაამარცხე არსებები',
      start_intro: 'მართე ჩოქელა, გამოიყენე ნამგალა კიდურები და გაიარე 8 რთული ტური ნამდვილი არსებების უნიკალური ბრძოლის სტილის წინააღმდეგ!',
      btn_start: 'თამაშის დაწყება',
      stages_label: '🗺️ ტურები',
      stage_start_tooltip: '{stage}. ტურის დაწყება',
      stage_locked_tooltip: 'ჯერ დაამარცხე {prevCreature}',
      progress_all_unlocked: 'ყველა ტური გახსნილია.',
      progress_some_unlocked: 'გახსნილია {unlocked} / {total} ტური — შემდეგი გაიხსნება გამარჯვების შემდეგ.',
      btn_epilogue: '📖 ეპილოგი',
      btn_settings_start: '⚙️ პარამეტრები',

      // Settings Modal
      settings_title: 'პარამეტრები',
      settings_subtitle: 'ჩოქელას ფერების მორგება, ხმის კონტროლი და ენა',
      settings_lang_label: '🌐 ენა',
      settings_color_label: '🦗 ჩოქელას შეფერილობა',
      settings_audio_label: '🔊 ხმის კონტროლი',
      sfx_label_on: 'ხმოვანი ეფექტები: ჩართულია',
      sfx_label_off: 'ხმოვანი ეფექტები: გამორთულია',
      bgm_label_on: 'მუსიკა: ჩართულია',
      bgm_label_off: 'მუსიკა: გამორთულია',
      btn_save_settings: 'შენახვა და დაბრუნება',

      // Epilogue Modal
      epilogue_title: 'ეპილოგი',
      epilogue_kicker: 'ჩოქელას ქრონიკა',
      epilogue_p1: 'რვა ბრძოლის შემდეგ ტყე კვლავ დადუმდა. ჩოქელამ დაამარცხა ყველა მეტოქე — კალიებიდან დაწყებული, გიგანტური კრაზანითა და გველით დამთავრებული.',
      epilogue_p2: 'თუმცა გამარჯვება მხოლოდ ძალაში არ ყოფილა. ჩოქელამ თითოეული არსების მოძრაობა, ფრთების რიტმი და თავდაცვის ხერხი შეისწავლა და ბუნების წონასწორობა დაიცვა.',
      epilogue_p3: 'გამთენიისას მწერები ისევ თავიანთ ადგილებს დაუბრუნდნენ, ხოლო ჩოქელა ფოთოლზე გაჩერდა — შემდეგი საფრთხის მოლოდინში.',
      epilogue_heading_starring: 'მთავარ როლში',
      epilogue_name_mantis: 'ჩოქელა',
      epilogue_heading_dwellers: 'ტყის მცხოვრებლები',
      epilogue_name_dwellers: 'კალიები • ბაყაყი • კრაზანა • გველი',
      epilogue_final_line: 'ეს დასასრულია… თუ ახალი თავგადასავლის დასაწყისი?',
      epilogue_the_end: 'დასასრული',
      btn_close_epilogue: 'მენიუში დაბრუნება',

      // Victory Modal
      victory_title: 'გამარჯვება!',
      victory_defeated: '{creature} დამარცხებულია!',
      bio_card_heading: 'ბიოლოგიური ცნობა:',
      btn_next_stage: 'შემდეგი ტური ➔',
      btn_replay_stage: 'თავიდან თამაში',

      // Defeat Modal
      defeat_title: 'მარცხი!',
      defeat_sub: '{creature}-მა დაამარცხა ჩოქელა...',
      tip_card_heading: 'ტაქტიკური რჩევა:',
      btn_retry: 'სცადე თავიდან ↺',

      // Campaign Clear Modal
      clear_title: '🏆 ჩემპიონი!',
      clear_subtitle: 'გილოცავთ! თქვენ დაამარცხეთ ყველა არსება, გველის ჩათვლით!',
      clear_card_heading: 'ჩოქელას ტრიუმფი:',
      clear_card_body: 'ჩოქელამ დაამტკიცა, რომ მწერების სამყაროს უმაღლესი მტაცებელია! გამოავლინა სისწრაფე, სტრატეგია, ბლოკის უნარი და დაამარცხა ბუნების ყველაზე სახიფათო მეტოქეები — კალიებიდან დაწყებული გიგანტური კრაზანითა და გველით დამთავრებული!',
      btn_play_again: 'ახლიდან დაწყება'
    }
  }
};

I18N.init();

if (typeof window !== 'undefined') {
  window.I18N = I18N;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18N;
}
