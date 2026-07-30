import { bi, type Bi } from '../i18n/types';
import { ROMANTIC_MODE_STORAGE_KEY } from '../utils/romanticMode';

/** Shared placeholder for entries without a real public URL yet */
export const WIP_HREF = '/wip/';

export type LinkItem = {
	title: Bi;
	href: string;
	venue?: Bi;
	year?: string | number;
	external?: boolean;
};

export type SecretPortraitStatus = {
	activationCount: 1 | 2 | 3 | 4 | 5 | 6 | 7;
	message: Bi;
};

export type SecretPortrait = {
	src: string;
	width: number;
	height: number;
	alt: Bi;
	caption: Bi;
	dialogLabel: Bi;
	closeLabel: Bi;
	turnOnLabel: Bi;
	turnOffLabel: Bi;
	modeOnMessage: Bi;
	modeOffMessage: Bi;
	storageKey: string;
	/**
	 * Per-tap toasts (1–7). Pre-unlock lines are game-like Easter-egg flavor —
	 * no remaining-tap counts, and “Romantic Mode” only on the unlock line (7).
	 */
	statusMessages: readonly SecretPortraitStatus[];
};

export const site = {
	name: bi('Siyuan Xue', '薛思远'),
	/** Short brand for <title> fallback */
	title: bi('Siyuan Xue', '薛思远'),
	description: bi(
		'Student in Intelligence Science and Technology at BUPT, working on AI systems and full-stack engineering.',
		'北京邮电大学智能科学与技术学生，关注 AI 系统与全栈工程。',
	),

	ui: {
		backToTop: bi('Back to top', '回到顶部'),
		essays: bi('Essays', '长文'),
		posts: bi('Short posts', '短记'),
		projects: bi('Projects', '项目'),
		research: bi('Research', '研究'),
		externalWriting: bi('Writing', '写作与表达'),
		appearances: bi('Interests', '兴趣爱好'),
		switchToEnglish: bi('Switch to English', '切换到英文'),
		switchToChinese: bi('Switch to Chinese', '切换到中文'),
		switchToLight: bi('Switch to light mode', '切换到浅色模式'),
		switchToDark: bi('Switch to dark mode', '切换到深色模式'),
		openContents: bi('Open contents', '打开目录'),
		closeContents: bi('Close contents', '关闭目录'),
	},

	bio: {
		lead: bi(
			'Siyuan Xue is a student in Intelligence Science and Technology at Beijing University of Posts and Telecommunications, focused on AI systems, agents, and full-stack engineering.',
			'薛思远是北京邮电大学智能科学与技术专业的学生，关注 AI 系统、智能体与全栈工程。',
		),
		more: [
			bi(
				'He has worked on university math teaching platforms, developer-facing agents, and end-to-end delivery of model inference services with demo sites.',
				'目前参与高校数学教学平台、开发者智能体等项目的设计与实现，也做过模型推理服务与配套展示站点的全链路交付。',
			),
			bi(
				'He studies at BUPT. Outside class he acts in university theatre and plays on the volleyball team.',
				'本科就读于北京邮电大学。课余参与话剧演出与排球校队。',
			),
		],
	},

	/** Editorial lifestyle portrait beside the home bio. */
	portrait: {
		src: '/images/portrait.jpg',
		width: 2560,
		height: 3840,
		alt: bi(
			'Siyuan Xue outdoors in light athletic wear against concrete architecture',
			'薛思远生活照：浅色运动外套，建筑庭院背景',
		),
	},

	/** Session-scoped, seven-activation portrait Easter egg. */
	secretPortrait: {
		src: '/images/p-202.jpg',
		width: 1200,
		height: 1800,
		alt: bi('A portrait in Romantic Mode', '心动模式中的一张肖像'),
		caption: bi(
			'Some stories are still in draft.',
			'有些故事还停在草稿里。',
		),
		dialogLabel: bi('Romantic Mode portrait', '心动模式肖像'),
		closeLabel: bi('Close Romantic Mode portrait', '关闭心动模式肖像'),
		turnOnLabel: bi('Turn on Romantic Mode', '开启心动模式'),
		turnOffLabel: bi('Turn off Romantic Mode', '关闭心动模式'),
		modeOnMessage: bi('Romantic Mode on.', '心动模式已开启。'),
		modeOffMessage: bi('Romantic Mode off.', '心动模式已关闭。'),
		storageKey: ROMANTIC_MODE_STORAGE_KEY,
		statusMessages: [
			{
				activationCount: 1,
				message: bi(
					'You poke the portrait. No tutorial appears.',
					'你戳了戳肖像。没有弹出教程。',
				),
			},
			{
				activationCount: 2,
				message: bi(
					'Side quest armed. Objective: classified.',
					'支线任务已就绪。目标：保密。',
				),
			},
			{
				activationCount: 3,
				message: bi(
					'The frame blinks first.',
					'画框先眨了眨眼。',
				),
			},
			{
				activationCount: 4,
				message: bi(
					'Inventory +1: unexplained curiosity.',
					'物品栏 +1：说不清的好奇心。',
				),
			},
			{
				activationCount: 5,
				message: bi(
					'A door without a map marker.',
					'一扇没有地图标记的门。',
				),
			},
			{
				activationCount: 6,
				message: bi(
					'The latch clicks. Still no boss music.',
					'门闩轻响。还是没有 Boss 音乐。',
				),
			},
			{
				activationCount: 7,
				message: bi('Romantic Mode unlocked.', '心动模式已解锁。'),
			},
		],
	} satisfies SecretPortrait,

	projects: [
		{
			title: bi('ProbFun', '邮趣数学'),
			href: 'https://umathhub.com',
			year: 2025,
			external: true,
		},
		{
			title: bi('iMathBook', 'iMathBook'),
			href: 'https://imathbook.com',
			year: 2025,
			external: true,
		},
		{
			title: bi('LeDA Agent', 'LeDA 智能体'),
			href: 'https://win.bupt.edu.cn/program.do?id=9909',
			year: 2026,
			external: true,
		},
		{
			title: bi('PixelDone', '像素清单'),
			href: 'https://github.com/Siyuan-Xue/PixelDone',
			year: 2026,
			external: true,
		},
	] satisfies LinkItem[],

	research: [
		{
			title: bi('Yuheng · multimodal metaphor detection', '语衡 · 多模态隐喻检测'),
			href: WIP_HREF,
			venue: bi('NLPCC', 'NLPCC'),
			year: 2026,
			external: false,
		},
	] satisfies LinkItem[],

	externalWriting: [] as LinkItem[],

	appearances: [
		{
			title: bi(
				'Walking with Light · Beijing Collegiate Drama Festival',
				'《与光同行》· 北京市大学生戏剧节',
			),
			href: 'https://www.bupt.edu.cn/info/1079/90114.htm',
			year: 2025,
			external: true,
		},
		{
			title: bi(
				'BUPT volleyball · school team & college team',
				'校排球队 · 院排球队',
			),
			href: WIP_HREF,
			external: false,
		},
	] satisfies LinkItem[],
};
