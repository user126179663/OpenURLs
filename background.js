class OpenUrls extends WX {
	
	static {
		
		this.tagName = 'open-urls',
		this.apiKeys = [ 'contextMenus', 'extension', 'notifications', 'permissions', 'runtime', 'storage', 'tabs', 'windows' ],
		
		this.CFG_PATH = 'cfg.json',
		
		this.defaultProtocol = 'https',
		this.secondaryProtocol = 'http',
		
		this.fixProtocolRx = /^(((h)?t)?tp(s)?)?(:\/\/)?/;
		
	}
	
	static getUrls(urls, ignoresNoScheme, upgradesToHttps, usesHttpByDefault) {
		
		if (urls && typeof urls === 'string' && (urls = urls.match(re_weburl_mod))) {
			
			let l;
			
			if (l = urls.length) {
				
				const	{ defaultProtocol, fixProtocolRx, secondaryProtocol } = this,
						definedDefaultProtocol = usesHttpByDefault ? secondaryProtocol : defaultProtocol;
				let i, url,matched;
				
				i = -1;
				while (++i < l)	urls[i] = url = (matched = (url = urls[i]).match(fixProtocolRx))[5] ?
											(
												matched[1] ?
													(matched[2] && matched[3]) || (matched[1] = 'http' + (matched[4] ?? '')) :
													(matched[1] = ignoresNoScheme || definedDefaultProtocol),
												matched[1] === ignoresNoScheme ?
													ignoresNoScheme :
													(
														matched[1] === 'http' && upgradesToHttps && (matched[1] += 's'),
														matched[1] + '://' + url.substring(matched[0].length)
													)
											) :
											ignoresNoScheme || (urls[i] = definedDefaultProtocol + '://' + url),
											url === true && (urls.splice(i--,1), --l);
				
				return urls;
				
			}
			
		}
		
		return null;
		
	}
	
	constructor(browser, apiKeys) {
		
		super(browser, apiKeys);
		
		this.notification = {
			noUrl:	{
							iconUrl: 'icon.svg',
							message: 'URL はありません。',
							title: this.meta?.name,
							type: 'basic'
						},
			notAllowedIncognitoAccess:	{
							iconUrl: 'icon.svg',
							message: 'プライベートウィンドウでの実行が許可されていないため、設定に基づいて URL をプライベートウィンドウで開くことができません。',
							title: this.meta?.name,
							type: 'basic'
						}
		},
		
		this.init();
		
	}
	
	init() {
		
		return this.inizitalized || !this.available ?
			(
				
				this.initialized = false,
				this.available = new Promise(async rs => {
					
					this.setting = {};
					
					const { CFG_PATH } = OpenUrls,
							{ browser, setting } = this,
							{ contextMenus, storage } = this.browser;
					let i,k, saves, storedStorage, cfg,v;
					
					await fetch(CFG_PATH).then(fetched => fetched.json()).then(json => cfg = json),
					
					await this.getStorage().then(storage => storedStorage = storage);
					
					const	{ ['main-item-in-context-menu']: mainMenuItem, values } = cfg, l = values.length,
							{ setting: stored = {} } = storedStorage;
					
					i = -1;
					while (++i < l) setting[k = (v = values[i]).key] = k in stored ? stored[k] : (saves ||= true, v.value);
					
					await this.setStorage({ setting, cfg }),
					
					this.updateMenu?.((this.mainMenuItem = mainMenuItem).option, true),
					
					this.initialized = true,
					
					rs(this);
					
				})
				
			) :
			this.available;
		
	}
	
	updateMenu(option = this.mainMenuItemOption, creates) {
		
		const	{
					browser: { contextMenus },
					meta: { name },
					setting: { ['show-selected-text']: showsText },
					mainMenuItem: { extendedMenuItemText, accessKey }
				} = this;
		let id, v;
		
		contextMenus && typeof contextMenus === 'object' && (
				
				(option = { ...option }).title = name + (showsText ? extendedMenuItemText : '') + accessKey,
				
				creates ?	(v = contextMenus.create?.(this.mainMenuItemOption = option)) :
								(id = option.id, delete option.id, v = contextMenus.update?.(id, option))
				
			);
		
		return v;
		
	}
	
	openUrls(urls, tabIndex) {
		
		const l = urls && (Array.isArray(urls) ? urls : (urls = [ urls ])).length,
				{ browser: { extension, tabs, notifications, windows }, notification, setting } = this;
		
		if (l) {
			
			const	hasTabIndex = typeof tabIndex === 'number',
					tabOption = { active: !!setting['move-tab-opened'] };
			let i;
			
			if (setting['open-incognito']) {
				
				extension.isAllowedIncognitoAccess().then(
						allowedIncognitoAccess =>
							allowedIncognitoAccess ?	windows.create?.({ incognito: true, url: urls }) :
																setting['enabled-notifications'] &&
																	(notifications?.create?.(notification.notAllowedIncognitoAccess))
					);
				
			} else {
				
				i = -1, hasTabIndex && (tabOption.index = tabIndex - 1);
				while (++i < l)	hasTabIndex && ++tabOption.index,
										tabOption.url = urls[i],
										tabs?.create?.(tabOption),
										i || (tabOption.active &&= false);
				
			}
			
		} else {
			
			setting['enabled-notifications'] && (notifications?.create?.(notification.noUrl));
			
		}
		
	}
	
	update(updated, forces) {
		
		const { setting } = this;
		let k;
		
		for (k in updated) (forces || k in setting) && (setting[k] = updated[k]);
		
		this.updateMenu();
		
	}
	
}

// オブジェクトが HTMLElement を継承する場合、インスタンスを作る前にオブジェクトを CustomElementRegistry.define で要素として定義する必要がある。
// でなければ Illigal constructor. のエラーになる。
customElements.define(OpenUrls.tagName, OpenUrls);

// オブジェクト OpenUrls は、初期化処理内に非同期処理が含まれている。
// これは background が実行中の時は問題になりにくいが、
// background は一度停止したあとにイベントなどを通じて再び実行されると、起動時と同じ処理を再び繰り返す。
// これは実質的な再起動で、停止前の変数の値などはすべて失われており、クロージャなどを通じて停止前と後での直接的な値の受け渡しもできない。
// こうした仕様そのものは実際にはあまり問題にならないかもしれないが、
// 以下のようにインスタンスを作成する時に、コンストラクター内に先に述べたような非同期処理が含まれていた場合、
// その非同期処理の完了前にイベントリスナーの実行が行なわれ、かつリスナーの中にインスタンスを使用する処理が含まれていると、
// インスタンスのプロパティの作成が間に合わなかった場合に処理に不整合を引き起こす恐れが生じる。
// そのため、ここではインスタンスの初期化処理の完了で解決する Promise を示すプロパティをインスタンスに作成し、
// イベントリスナー内ではそのプロパティが持つ Promise の解決後に続く処理を実行するようにしている。
// 具体的には openUrls.available が初期化処理の完了を確認できるプロパティで、
// openUrls.available.then(...) で、イベントが通知されたリスナー内ののインスタンスを使う処理を実行している。
const openUrls = new OpenUrls(browser || chrome);

browser.action?.onClicked?.addListener?.(() => browser.runtime.openOptionsPage()),

browser.storage?.onChanged?.addListener?.(storageChange => {
		
		openUrls.available.then(() => {
			
			openUrls.getStorage('setting').then(storage => openUrls.update(storage.setting));
			
		});
		
	}),
browser.contextMenus?.onClicked?.addListener?.((info, tab) => {
		
		openUrls.available.then(() =>
				openUrls.openUrls(
						OpenUrls.getUrls(
								info.selectionText,
								openUrls.setting['ignore-no-scheme'],
								openUrls.setting['upgrade-https'],
								openUrls.setting['default-protocol']
							),
						tab.index + 1
					)
			);
		
	});