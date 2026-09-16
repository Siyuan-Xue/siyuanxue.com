
	import PhotoSwipeLightbox from 'photoswipe/lightbox';
import PhotoSwipe from 'photoswipe';
	import 'photoswipe/style.css';
	import {
		advanceRomanticMode,
		createRomanticModeState,
        type RomanticModeState,
	} from './romanticMode';
	import {
		createRomanticLightboxOptions,
		labelRomanticLightboxDialog,
		getRomanticLightboxLayout,
		getRomanticLightboxMotionProfile,
		shouldKeepRomanticLightboxPlaceholder,
	} from './romanticLightbox';
	import {
		createRomanticLightboxMotion,
		type RomanticLightboxMotionController,
	} from './romanticLightboxMotion';

	export function initRomanticPortrait(root: HTMLElement, initialState?: RomanticModeState) {
		const trigger = root.querySelector<HTMLButtonElement>('[data-romantic-trigger]');
		const primaryImage = root.querySelector<HTMLImageElement>('[data-primary-image]');
		const primaryLoadingSlot = root.querySelector<HTMLElement>('[data-primary-loading-slot]');
		const secretCard = root.querySelector<HTMLAnchorElement>('[data-secret-card]');
		const secretImageSlot = root.querySelector<HTMLElement>('[data-secret-image-slot]');
		const status = root.querySelector<HTMLElement>('[data-romantic-status]');

		if (
			!trigger ||
			!primaryImage ||
			!secretCard ||
			!secretImageSlot ||
			!status
		) {
			return;
		}

		let state = initialState ?? createRomanticModeState();
		let activeStatusName: string | null = null;
		let toastTimer: number | undefined;
		let concealTimer: number | undefined;
		let revealFrame: number | undefined;
		let secretImage: HTMLImageElement | null = null;
		let secretImageFailed = false;

		const localized = (name: string) => root.dataset[name] ?? '';

		let lightboxFrame: HTMLElement | null = null;
		let lightboxReveal: HTMLElement | null = null;
		let lightboxRevealBand: HTMLElement | null = null;
		let lightboxFooter: HTMLElement | null = null;
		let lightboxCaptionText: HTMLElement | null = null;
		let lightboxProof: HTMLElement | null = null;
		let lightboxClose: HTMLElement | null = null;
		let lightboxMotion: RomanticLightboxMotionController | null = null;

		const lightbox = new PhotoSwipeLightbox({
			gallery: root,
			children: '[data-romantic-lightbox-trigger]',
			pswpModule: PhotoSwipe,
			...createRomanticLightboxOptions(localized('closeLabel')),
			errorMsg: localized('loadError'),
		});

		lightbox.addFilter('thumbEl', () => secretImage ?? secretCard);
		lightbox.addFilter('isKeepingPlaceholder', (defaultKeep, content) =>
			shouldKeepRomanticLightboxPlaceholder(defaultKeep, {
				isOpening: lightbox.pswp?.opener.isOpening ?? false,
				hasMountedImage: Boolean(content.element?.parentElement),
			}),
		);

		const setLoading = (slot: HTMLElement | null | undefined, loading: boolean) => {
			if (!slot) return;
			slot.classList.toggle('is-loading', loading);
		};

		const bindImageLoading = (
			image: HTMLImageElement,
			slot: HTMLElement | null | undefined,
			onFailure: () => void = () => {},
		) => {
			const finish = () => setLoading(slot, false);
			const fail = () => {
				finish();
				onFailure();
				status.textContent = localized('loadError');
				status.classList.add('is-visible');
			};
			if (image.complete) {
				if (image.naturalWidth > 0) finish();
				else fail();
				return;
			}
			setLoading(slot, true);
			image.addEventListener('load', finish, { once: true });
			image.addEventListener('error', fail, { once: true });
		};

		// Primary portrait — md/faint loader until first paint of the photo.
		bindImageLoading(primaryImage, primaryLoadingSlot);

		const makeSecretImage = (className: string) => {
			const image = document.createElement('img');
			image.className = className;
			image.alt = localized('secretAlt');
			image.width = Number(root.dataset.secretWidth) || 1200;
			image.height = Number(root.dataset.secretHeight) || 1800;
			image.decoding = 'async';
			image.src = root.dataset.secretSrc ?? '';
			return image;
		};

		const ensureSecretImage = () => {
			if (secretImage && !secretImageFailed) return;
			secretImage?.remove();
			secretImageFailed = false;
			setLoading(secretCard, true);
			secretImage = makeSecretImage(
				'bio-portrait_img romantic-portrait_image romantic-portrait_secret-image',
			);
			bindImageLoading(secretImage, secretCard, () => { secretImageFailed = true; });
			secretImageSlot.append(secretImage);
		};

		const syncLanguage = () => {
			primaryImage.alt = localized('primaryAlt');
			secretCard.setAttribute('aria-label', localized('dialogLabel'));
				trigger.setAttribute(
					'aria-label',
					localized(state.active ? 'turnOffLabel' : 'turnOnLabel'),
				);

			if (secretImage) secretImage.alt = localized('secretAlt');
			if (activeStatusName) {
				status.textContent = localized(activeStatusName);
			}

			const caption = localized('caption');
			const closeLabel = localized('closeLabel');
			lightbox.options.closeTitle = closeLabel;
			if (lightbox.pswp) lightbox.pswp.options.closeTitle = closeLabel;
			if (lightboxCaptionText) lightboxCaptionText.textContent = caption;
			if (lightboxProof) lightboxProof.textContent = root.dataset.proofLabel ?? '';
			if (lightboxClose) lightboxClose.setAttribute('aria-label', closeLabel);
		};

		lightbox.on('uiRegister', () => {
			const pswp = lightbox.pswp;
			if (!pswp?.ui) return;

			pswp.ui.registerElement({
				name: 'romantic-frame',
				className: 'romantic-lightbox_frame',
				appendTo: 'root',
				onInit: (element) => {
					lightboxFrame = element;
				},
			});

			pswp.ui.registerElement({
				name: 'romantic-reveal',
				className: 'romantic-lightbox_reveal',
				appendTo: 'root',
				onInit: (element) => {
					lightboxReveal = element;
					lightboxRevealBand = document.createElement('span');
					lightboxRevealBand.className = 'romantic-lightbox_reveal-band';
					lightboxRevealBand.setAttribute('aria-hidden', 'true');
					element.append(lightboxRevealBand);
				},
			});

			pswp.ui.registerElement({
				name: 'romantic-footer',
				className: 'romantic-lightbox_footer',
				appendTo: 'root',
				onInit: (element) => {
					lightboxFooter = element;
					lightboxCaptionText = document.createElement('span');
					lightboxCaptionText.className = 'romantic-lightbox_caption-text';
					lightboxProof = document.createElement('small');
					lightboxProof.className = 'romantic-lightbox_proof';
					element.append(lightboxCaptionText, lightboxProof);
					syncLanguage();
				},
			});

			pswp.ui.registerElement({
				name: 'romantic-close',
				className: 'romantic-lightbox_close',
				appendTo: 'root',
				isButton: true,
				ariaLabel: localized('closeLabel'),
				html: root.querySelector<HTMLTemplateElement>('[data-lightbox-close-icon]')?.innerHTML ?? '',
				onClick: 'close',
				onInit: (element) => {
					lightboxClose = element;
					// Preserve the thumbnail as PhotoSwipe's pointer-open focus target.
					element.addEventListener('mousedown', (event) => event.preventDefault());
					syncLanguage();
				},
			});
		});

		const syncLightboxLayout = () => {
			const pswp = lightbox.pswp;
			if (!pswp?.element) return;

			const layout = getRomanticLightboxLayout(pswp.viewportSize);
			const properties = {
				'--romantic-lightbox-media-width': layout.mediaWidth,
				'--romantic-lightbox-media-height': layout.mediaHeight,
				'--romantic-lightbox-media-top': layout.mediaTop,
				'--romantic-lightbox-frame-width': layout.frameWidth,
				'--romantic-lightbox-frame-half-width': layout.frameWidth / 2,
				'--romantic-lightbox-frame-height': layout.frameHeight,
				'--romantic-lightbox-frame-top': layout.frameTop,
				'--romantic-lightbox-matte': layout.matte,
				'--romantic-lightbox-footer-height': layout.footerHeight,
			};

			for (const [name, value] of Object.entries(properties)) {
				pswp.element.style.setProperty(name, `${value}px`);
			}
		};

		lightbox.on('afterInit', () => {
			const element = lightbox.pswp?.element;
			if (element) labelRomanticLightboxDialog(element, localized('dialogLabel'));
			syncLightboxLayout();
		});
		lightbox.on('resize', syncLightboxLayout);

		const getCurrentMotionProfile = () =>
			getRomanticLightboxMotionProfile(
				{ x: window.innerWidth, y: window.innerHeight },
				window.matchMedia('(prefers-reduced-motion: reduce)').matches,
			);

		lightbox.on('firstUpdate', () => {
			const pswp = lightbox.pswp;
			if (!pswp) return;
			const profile = getCurrentMotionProfile();
			pswp.options.showAnimationDuration = profile.showDurationMs;
			pswp.options.hideAnimationDuration = profile.hideDurationMs;
		});

		lightbox.on('openingAnimationStart', () => {
			const pswp = lightbox.pswp;
			if (
				!pswp?.currSlide?.container ||
				!lightboxFrame ||
				!lightboxReveal ||
				!lightboxRevealBand ||
				!lightboxFooter ||
				!lightboxProof ||
				!lightboxClose
			) {
				return;
			}

			const images = Array.from(
				pswp.currSlide.container.querySelectorAll<HTMLElement>('.pswp__img'),
			);
			if (images.length === 0) return;

			pswp.options.easing = 'cubic-bezier(0.16,1,0.3,1)';
			lightboxMotion?.destroy();
			lightboxMotion = createRomanticLightboxMotion(
				{
					frame: lightboxFrame,
					image: images,
					reveal: lightboxReveal,
					footer: lightboxFooter,
					proof: lightboxProof,
					close: lightboxClose,
					sweep: lightboxRevealBand,
				},
				getCurrentMotionProfile(),
			);
			lightboxMotion.playOpen();
		});

		lightbox.on('openingAnimationEnd', () => {
			if (lightbox.pswp) {
				lightbox.pswp.options.easing = 'cubic-bezier(.4,0,.22,1)';
			}
		});

		lightbox.on('closingAnimationStart', () => {
			if (lightbox.pswp) {
				lightbox.pswp.options.easing = 'cubic-bezier(0.7,0,0.84,0)';
			}
			lightboxMotion?.playClose();
		});

		lightbox.on('destroy', () => {
			lightboxMotion?.destroy();
			lightboxMotion = null;
			lightboxFrame = null;
			lightboxReveal = null;
			lightboxRevealBand = null;
			lightboxFooter = null;
			lightboxCaptionText = null;
			lightboxProof = null;
			lightboxClose = null;
		});

		const showStatus = (name: string, duration = 2800) => {
			activeStatusName = name;
			status.textContent = localized(name);
			status.classList.add('is-visible');
			if (toastTimer !== undefined) window.clearTimeout(toastTimer);
			toastTimer = window.setTimeout(() => {
				status.classList.remove('is-visible');
				status.textContent = '';
				activeStatusName = null;
			}, duration);
		};

		const syncTriggerState = () => {
			trigger.setAttribute('aria-expanded', String(state.active));
				trigger.setAttribute('aria-pressed', String(state.active));
				trigger.setAttribute(
					'aria-label',
					localized(state.active ? 'turnOffLabel' : 'turnOnLabel'),
				);

		};

		const reveal = (animate: boolean) => {
			if (concealTimer !== undefined) {
				window.clearTimeout(concealTimer);
				concealTimer = undefined;
			}
			if (revealFrame !== undefined) {
				window.cancelAnimationFrame(revealFrame);
				revealFrame = undefined;
			}
			ensureSecretImage();
			syncTriggerState();

			if (!animate) {
				secretCard.hidden = false;
				root.classList.add('is-active');
				return;
			}

			secretCard.hidden = false;
			void secretCard.offsetWidth;
			revealFrame = window.requestAnimationFrame(() => {
				if (state.active) root.classList.add('is-active');
				revealFrame = undefined;
			});
		};

		const conceal = (animate: boolean) => {
			if (concealTimer !== undefined) window.clearTimeout(concealTimer);
			if (revealFrame !== undefined) {
				window.cancelAnimationFrame(revealFrame);
				revealFrame = undefined;
			}
			root.classList.remove('is-active');
			syncTriggerState();

			const reducedMotion = window.matchMedia(
				'(prefers-reduced-motion: reduce)',
			).matches;
			if (!animate || reducedMotion) {
				secretCard.hidden = true;
				concealTimer = undefined;
				return;
			}

			concealTimer = window.setTimeout(() => {
				if (!state.active) secretCard.hidden = true;
				concealTimer = undefined;
			}, 600);
		};

		trigger.addEventListener('click', () => {
			state = advanceRomanticMode(state).state;
			if (state.active) {
				reveal(true);
				showStatus('modeOn');
			} else {
				conceal(true);
				showStatus('modeOff');
			}
		});


		lightbox.init();
		syncLanguage();
		if (state.active) {
			reveal(true);
		} else {
			conceal(false);
		}
	}
