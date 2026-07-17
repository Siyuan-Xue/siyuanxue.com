import { bi, type Bi } from '../i18n/types';

export type LinkItem = {
	title: Bi;
	href: string;
	venue?: Bi;
	year?: string | number;
	external?: boolean;
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
		more: bi('More', '更多'),
		less: bi('Less', '收起'),
		backToTop: bi('Back to top', '回到顶部'),
		essays: bi('Essays', '长文'),
		posts: bi('Short posts', '短记'),
		projects: bi('Projects', '项目'),
		externalWriting: bi('Writing', '写作与表达'),
		appearances: bi('Stage & activities', '舞台与活动'),
		switchToEnglish: bi('Switch to English', '切换到英文'),
		switchToChinese: bi('Switch to Chinese', '切换到中文'),
		switchToLight: bi('Switch to light mode', '切换到浅色模式'),
		switchToDark: bi('Switch to dark mode', '切换到深色模式'),
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

	projects: [
		{
			title: bi('YouQu Math + iMathBook', '邮趣数学 + iMathBook'),
			href: '#',
			year: 2025,
			external: false,
		},
		{
			title: bi('LeDA Agent', 'LeDA 智能体'),
			href: '#',
			year: 2026,
			external: false,
		},
		{
			title: bi('Yuheng · multimodal metaphor detection', '语衡 · 多模态隐喻检测'),
			href: '#',
			year: 2025,
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
			href: '#',
			year: 2025,
			external: false,
		},
	] satisfies LinkItem[],
};
