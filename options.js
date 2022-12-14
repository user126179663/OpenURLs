class OpenUrlsOptions extends WX {
	
	static {
		
		this.tagName = 'open-urls-options',
		this.template = this.tagName,
		
		//this.apiKeys = [ 'contextMenus', 'extension', 'permissions', 'runtime', 'storage' ];
		this.apiKeys = [ 'extension', 'permissions', 'runtime', 'storage' ];
		
	}
	
	static getPermissionsListFromNodes(nodes) {
		
		const	permissionsList = [], l = nodes.length;
		let i,i0,l0,i1, node, permissions,permission;
		
		i = i1 = -1;
		while (++i < l) {
			
			if ((node = nodes[i]) instanceof HTMLElement) {
				
				i0 = -1, l0 = (permissions = node.dataset.permissions.split(' ')).length;
				while (++i0 < l0)
					permissionsList.indexOf(permission = permissions[i0]) === -1 && (permissionsList[++i1] = permission);
				
			}
			
		}
		
		return permissionsList;
		
	}
	
	static getCtrlValue(ctrl) {
		
		return ctrl.disabled ? !!ctrl.dataset.disabledValue : ctrl.checked;
		
	}
	
	static applied({ detail: event }) {
		
		if (event && typeof event === 'object') {
			
			const { detail, setting } = event;
			
			if (detail && typeof detail === 'object') {
				
				const { target } = detail;
				
				switch (target?.id) {
					
					//case 'show-selected-text':
					//
					//if (target.checked === detail.beforeApplied) {
					//	
					//	const	mainMenuItemSetting = this.cfg['main-item-in-context-menu'],
					//			mainMenuItemOption = { ...mainMenuItemSetting.option };
					//	
					//	delete mainMenuItemOption.id,
					//	
					//	mainMenuItemOption.title =	this.meta.name +
					//										(target.checked ? mainMenuItemSetting.extendedMenuItemText : '') +
					//										mainMenuItemSetting.accessKey,
					//	
					//	this.browser.contextMenus.update(mainMenuItemSetting.option.id, mainMenuItemOption);
					//	
					//}
					//
					//break;
					
					default:
					
				}
				
			}
			
		}
		
	}
	// * * * 重要 * * *
	// このリスナーに非同期処理を追加する場合、必ず this.browser.permissions.request よりあとにするか、
	// その処理を行わないことが確定している場合に限ること。でなければ以下のエラーが生じる。
	// Error: permissions.request may only be called from a user input handler
	// これはリスナーの実行がユーザーの操作に基づいていないことを示すが、実際にクリックなどのユーザーの操作を通じてリスナーが起動しても、
	// そのリスナーの中で一度でも非同期処理を経ると ユーザーの操作外の処理と見なされ、this.browser.permissions.request の実行は失敗する。
	static async changedCtrl({ target }) {
		
		const	{ apiKeys } = this,
				ctrls = this.getControllers(), l = ctrls.length,
				valueNodes = this.getValueNodes(), vl = valueNodes.length;
		let i, ctrl, node, reflection, permissionLists, callback;
		
		switch (target.id) {
			
			case 'restore-default-settings':
			
			const { cfg: { values }, defaultValue, lastSetting } = this;
			let i0,l0,i1,k, v;
			
			i = i0 = i1 = -1, l0 = values.length, permissionLists = [];
			while (++i < vl) {
				
				if ((node = valueNodes[i]).dataset.permissions) {
					
					i0 = -1, k = node.id;
					while (++i0 < l0 && k !== values[i0].key);
					i0 === l0 || ((v = values[i0].value) && lastSetting[k] !== v && (permissionLists[++i1] = node));
					
				}
			
			}
			
			permissionLists = this.flatPermissionsLists(apiKeys, permissionLists).grants,
			reflection = [ this.apply, this, [ defaultValue ] ];
			
			break;
			
			case 'open-incognito':
			
			if (target.checked) {
				
				let enabledIncognito;
				
				await this.browser.extension.isAllowedIncognitoAccess().then(v => enabledIncognito = v);
				
				if (!enabledIncognito) {
					target.checked = false;
					return;
				}
				
			}
			
			permissionLists = this.flatPermissionsLists(apiKeys).grants,
			reflection ||= [ this.save, this, [] ];
			
			break;
			
			//case 'show-selected-text':
			//
			//reflection = [ this.save, this, [ { target, beforeApplied: target.checked } ] ];
			//
			default:
			
			permissionLists = this.flatPermissionsLists(apiKeys).grants,
			
			reflection ||= [ this.save, this, [] ];
			
		}
		
		if (Array.isArray(permissionLists) && permissionLists.length) {
			
			const settingsNode = this.shadow.getElementById('settings');
			
			settingsNode.setAttribute('disabled', ''),
			
			await this.browser.permissions.request({ permissions: permissionLists }).
				then(result => result || (target instanceof HTMLInputElement && (target.checked = false))),
			
			settingsNode.removeAttribute('disabled');
			
		}
		
		reflection && Reflect.apply(...reflection);
		
	}
	
	static changedValues() {
		
		this.getStorage('setting').then(storage => {
				
				const { setting } = this, { setting: stored } = storage;
				let k;
				
				for (k in stored) if (stored[k] !== setting[k]) { this.apply(stored); break; }
				
			});
		
	}
	//static changedPermissions({ detail: { apiKeys, changed: { permissions }, current, type } }) {
	//	
	//	switch (type) {
	//		
	//		case 'add':
	//		
	//		break;
	//		
	//		case 'remove':
	//		
	//		const { setting, shadow } = this, l = permissions.length;
	//		let i,i0,l0, removalNodes;
	//		
	//		i = -1;
	//		while (++i < l) {
	//			i0 = -1, l0 = (removalNodes = shadow.querySelectorAll(`[data-permissions~="${permissions[i]}"]`)).length;
	//			while (++i0 < l0) setting[removalNodes[i].id] = false;
	//		}
	//		
	//		break;
	//	}
	//	
	//	this.apply();
	//	
	//}
	static appliedCommandsList() {
		
		const	{ setting, shadow } = this,
				commandViews = shadow.querySelectorAll('#commands-list command-view'), l = commandViews.length;
		let i;
		
		i = -1;
		while (++i < l) commandViews[i].apply(setting);
		
	}
	
	constructor(wxApi = browser || chrome, apiKeys) {
		
		super(wxApi, apiKeys);
		
		const { applied, appliedCommandsList, changedCtrl, changedValues } = OpenUrlsOptions;
		
		this.applied = applied.bind(this),
		this.appliedCommandsList = appliedCommandsList.bind(this),
		this.changedCtrl = changedCtrl.bind(this),
		this.changedValues = changedValues.bind(this),
		
		(this.shadow = this.attachShadow({ mode: 'open' })).
			appendChild(document.getElementById(OpenUrlsOptions.template).cloneNode(true).content);
		
	}
	connectedCallback() {
		
		this.setting || this.available.then(() => this.init());
		
	}
	
	async init() {
		
		await this.getStorage().then(storage => (this.setting = storage.setting, this.cfg = storage.cfg));
		
		const	settingsNode = this.shadow.getElementById('values'),
				{ values } = this.cfg, l = values.length, defaultValue = this.defaultValue = {};
		let i, v;
		
		i = -1;
		while (++i < l) defaultValue[(v = values[i]).key] = v.value;
		
		this.ac?.abort?.();
		while (settingsNode.firstElementChild) settingsNode.firstElementChild.remove();
		
		settingsNode.appendChild(
				WX.construct(
					this.cfg.values, undefined, undefined,
					(elm, data) => {
						
						const valueNode = elm.querySelector('.configurable');
						
						'key' in data && (valueNode.id = elm.querySelector('label').htmlFor = data.key),
						'permissions' in data && (valueNode.dataset.permissions = data.permissions.join(' '))
						
					}
				)
			),
		
		this.addEventListener('applied', this.applied),
		this.browser.storage?.onChanged?.addListener?.(this.changedValues),
		
		this.lastSetting = {},
		
		this.viewCommands(
			{
				'open-incognito': {
					'suggested_key': {
						'default': 'Shift+左クリック'
					},
					description: '選択中のテキスト内の URL をプライベートウィンドウで開きます。',
					descriptions: [
						{ true: [ 'open-incognito' ], text: '選択中のテキスト内の URL を同じウィンドウ内に開きます。', exclusive: true }
					]
				},
				'enable-copying-urls': {
					'suggested_key': {
						'default': 'Ctrl+左クリック'
					},
					available: [ 'enable-copying-urls' ],
					description: '選択中のテキスト内の URL をクリップボードにコピーします。'
				}
			}
		),
		this.appliedCommandsList(),
		this.addEventListener('applied', this.appliedCommandsList),
		
		this.apply();
		
	}
	
	viewCommands(commands = this.meta?.commands) {
		
		if (commands) {
			
			const views = [];
			let i,k;
			
			i = -1;
			for (k in commands) (views[++i] = document.createElement('command-view')).set(k, commands[k]);
			
			i === -1 || this.shadow.getElementById('commands-list').append(...views);
			
		}
		
	}
	
	getValueNodes() {
		
		return this.shadow.querySelectorAll('.configurable');
		
	}
	
	getControllers() {
		
		const	ctrls = [
					...this.getValueNodes(),
					...this.shadow.querySelectorAll('input:not(.configurable), button')
				],
				l = ctrls.length;
		let i, ctrl;
		
		i = -1;
		while (++i < l) (ctrl = ctrls[i]).dataset.eventType ||= 'change';
		
		return ctrls;
		
	}
	
	save(detail) {
		
		const { getCtrlValue } = OpenUrlsOptions, { setting } = this, ctrls = this.getControllers(), l = ctrls.length;
		let i,k, ctrl;
		
		i = -1;
		while (++i < l) this.constrain(ctrl = ctrls[i]);
		
		i = -1;
		while (++i < l) (k = (ctrl = ctrls[i]).id) && (setting[k] = getCtrlValue(ctrl));
		
		this.apply(setting, true, detail);
		
	}
	
	async apply(setting = this.setting, disablesUpdate, detail) {
		
		const	{ ac, lastSetting, shadow } = this,
				ctrls = this.getControllers(), valueNodes = this.getValueNodes(), removalNodes = [],
				field = this.shadow.getElementById('values');
		let i,l,i0,l0,k, ctrl, node, current, changedSetting, granted;
		
		i = i0 = -1, l  = valueNodes.length, field.setAttribute('disabled', ''), this.ac?.abort?.();
		while (++i < l)
			current = setting[k = (node = valueNodes[i]).id],
			disablesUpdate || (node.checked = current),
			node.dataset.permissions && !current && lastSetting[k] !== current && (removalNodes[++i0] = node);
		
		if (i0 !== -1) {
			
			const	{ permissions } = this.browser,
					{ revocation } = this.flatPermissionsLists(null, granted = await this.getGrantedApiKeys(), removalNodes);
			
			await permissions.remove({ permissions: revocation }).then(async result => {
					
					if (result) {
						
						const l = revocation.length;
						let i,i0;
						
						i = -1;
						while (++i < l) (i0 = granted.indexOf(revocation[i])) === -1 || granted.splice(i0,1);
						
					} else granted = await this.getGrantedApiKeys();
					
				});
			
			const grantNodes = document.querySelectorAll(`[data-permissions]`);
			let plist;
			
			// setting と対応する input との値の整合性を確認しているが、
			// 値の変化が他の input と連動している可能性があるため、不整合が確認できても
			// このブロック内では input の値は変化させず、このブロック後に再帰処理してすべての input の値を setting に準じさせる。
			
			i = -1, l = grantNodes.length;
			while (++i < l) {
				i0 = -1, l0 = (plist = (node = grantNodes[i]).dataset.permissions.split(' ')).length;
				while (++i0 < l0 && granted.indexOf(plist[i0]) !== -1);
				i0 === l0 || (k = node.id, changedSetting ||= setting[k] !== false, setting[k] &&= false);
			}
			
		}
		
		this.lastSetting = { ...setting };
		
		if (changedSetting) {
			
			await this.apply(setting, disablesUpdate, detail);
			
		} else {
			
			this.browser.storage?.onChanged?.removeListener?.(this.changedValues),
			await this.setStorage({ setting });
			this.browser.storage?.onChanged?.addListener?.(this.changedValues);
			
			const eventOption = { signal: (this.ac = new AbortController()).signal };
			
			i = -1, l = ctrls.length;
			while (++i < l) (ctrl = ctrls[i]).addEventListener(ctrl.dataset.eventType, this.changedCtrl, eventOption);
			
			i = -1, l = valueNodes.length, field.removeAttribute('disabled');
			while (++i < l) this.constrain(valueNodes[i]);
			
			field.classList[setting['unwant-hints'] ? 'add' : 'remove']('no-hint'),
			
			this.dispatchEvent(new CustomEvent('applied', { detail: { setting, detail } }));
			
			//hi(setting);
			
		}
		
	}
	
	constrain(target) {
		
		const { shadow } = this, { checked } = target, disabled = [], enabled = [];
		let i,l,i0,i1, ctrls,ctrl, enables;
		
		i = -1, l = (ctrls = shadow.querySelectorAll(target.dataset.disableTrue)).length;
		while (++i < l) {
			('disable-true' in (ctrl = ctrls[i]).dataset || 'disable-false' in ctrl.dataset) && this.constrain(ctrl);
			if (ctrl.hasAttribute('disabled') ? !!ctrl.dataset.disabledValue : ctrl.checked) break;
		}
		
		if (enables = i === l) {
			
			i = -1, l = (ctrls = shadow.querySelectorAll(target.dataset.disableFalse)).length;
			while (++i < l) {
				('disable-true' in (ctrl = ctrls[i]).dataset || 'disable-false' in ctrl.dataset) && this.constrain(ctrl);
				if (ctrl.hasAttribute('disabled') ? !ctrl.dataset.disabledValue : !ctrl.checked) break;
			}
			
			enables = i === l;
			
		}
		
		target[(enables ? 'remove' : 'set') + 'Attribute']('disabled', '');
		
	}
	
	flatPermissionsLists(
		granted,
		grantNodes = this.shadow.querySelectorAll(':checked[data-permissions]'),
		revokeNodes = this.shadow.querySelectorAll(':not(:checked)[data-permissions]')
	) {
		
		const	{ getPermissionsListFromNodes } = OpenUrlsOptions,
				grants = getPermissionsListFromNodes(grantNodes),
				revocation = getPermissionsListFromNodes(revokeNodes);
		let i,i0,l, grant;
		
		i = -1, l = grants.length;
		while (++i < l)	grant = grants[i],
								granted && (granted.indexOf(grant) === -1 || (grants.splice(i--,1), --l)),
								(i0 = revocation.indexOf(grant)) === -1 || revocation.split(i0, 1);
		
		return { grants, revocation };
		
	}
	
}

class CommandView extends HTMLElement {
	
	static {
		
		this.tagName = 'command-view',
		this.template = this.tagName;
		
	}
	
	constructor() {
		
		super();
		
		(this.shadow = this.attachShadow({ mode: 'open' })).
			appendChild(document.getElementById(CommandView.template).cloneNode(true).content);
		
	}
	
	apply(setting) {
		
		const { dataset: { available } } = this, descriptions = this.querySelectorAll('.description:not(.default)');
		let i,l,i0,l0, description, conditions;
		
		i = -1, l = (conditions = available?.split?.(' '))?.length ?? 0;
		while (++i < l && setting[conditions[i]]);
		this.classList[i === l ? 'add' : 'remove']('available');
		
		if (l = descriptions.length) {
			
			let keys;
			
			i = -1;
			while (++i < l) {
				
				const	{ dataset: { true: tk, false: fk } } = description = descriptions[i];
				
				i0 = -1, l0 = (keys = tk?.split?.(' '))?.length ?? 0;
				while (++i0 < l0 && setting[keys[i0]]);
				
				if (i0 === l0) {
					
					i0 = -1, l0 = (keys = fk?.split?.(' '))?.length ?? 0;
					while (++i0 < l0 && !setting[keys[i0]]);
					
				}
				
				description.classList[i0 === l0 ? 'add' : 'remove']('visible');
				
			}
			
			this.querySelector('.description.default').
				classList[this.querySelector('.visible[data-exclusive]') ? 'add' : 'remove']('hide');
			
		}
	}
	
	set(name, command) {
		
		const	{ available, description, descriptions, suggested_key } = command,
				suggested = suggested_key.default.split('+'),
				suggestedNode =	this.shadow.querySelector('slot[name="suggested"]').assignedNodes()[0] ||
											document.createElement('div'),
				nodes = [],
				{ isArray } = Array;
		let i,l,i0, node, desc;
		
		this.dataset.commandName = this.shadow.getElementById('root').dataset.name = name,
		
		available && (this.dataset.available = available.join(' '));
		
		while (suggestedNode.firstChildElement) suggestedNode.firstChildElement.remove();
		
		i = -1, l = suggested.length;
		while (++i < l)	(nodes[i] = node = document.createElement('span')).textContent = suggested[i],
								node.classList.add('command-key', 'key-top');
		
		suggestedNode.slot ||= 'suggested',
		suggestedNode.append(...nodes),
		
		nodes.length = 0,
		(
			nodes[i0 = 0] = node =	this.querySelector('.description.default') ||
											document.createElement('div')
		).textContent = description,
		node.classList.add(node.slot ||= 'description', 'default'),
		
		i = -1, l = descriptions?.length ?? 0;
		while (++i < l)	(nodes[++i0] = node = document.createElement('div')).textContent =
									(desc = descriptions[i]).text,
								isArray(desc.true) && (node.dataset.true = desc.true.join(' ')),
								isArray(desc.false) && (node.dataset.false = desc.false.join(' ')),
								desc.exclusive && (node.dataset.exclusive = ''),
								node.classList.add(node.slot = 'description');
		
		this.append(suggestedNode, ...nodes);
		
	}
	
}

customElements.define(CommandView.tagName, CommandView),
customElements.define(OpenUrlsOptions.tagName, OpenUrlsOptions);