import { bi, type Bi } from '../i18n/types';

/** Shared placeholder for entries without a real public URL yet */
export const WIP_HREF = '/wip/';

export type LinkItem = {
	title: Bi;
	href: string;
	gallerySlug?: string;
	venue?: Bi;
	year?: string | number;
	external?: boolean;
};

export type SecretPortrait = {
	mediaId: string;
	width: number;
	height: number;
	alt: Bi;
	caption: Bi;
	dialogLabel: Bi;
	closeLabel: Bi;
	turnOnLabel: Bi;
	turnOffLabel: Bi;
};

export const site = {
	name: bi('Siyuan Xue', '薛思远'),
	/** Short brand for <title> fallback */
	title: bi('Siyuan Xue', '薛思远'),
	homeTitle: bi('Siyuan Xue（薛思远）｜Personal Website', '薛思远（Siyuan Xue）｜个人网站'),
	github: 'https://github.com/Siyuan-Xue',
	description: bi(
		'Siyuan Xue (薛思远), a BUPT student of Intelligence Science and Technology, passionate about products and technology, exploring the unknown, and pursuing excellence and perfection.',
		'薛思远（Siyuan Xue）的个人网站。北京邮电大学智能科学与技术专业的学生，热衷于探索未知，追求极致与完美，对产品与技术倾注热情。',
	),

	ui: {
		showActions: bi('Show actions', '展开操作'),
		hideActions: bi('Hide actions', '收起操作'),
		backToTop: bi('Back to top', '回到顶部'),
		blog: bi('Blog', '博客'),
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
			'Siyuan Xue is a student of Intelligence Science and Technology at Beijing University of Posts and Telecommunications. He is passionate about exploring the unknown and pursuing excellence and perfection. He pours his passion into products and technology, finding joy in making things himself and bringing moments of surprise to everyday life.',
			'薛思远是北京邮电大学智能科学与技术专业的学生。他热衷于探索未知，追求极致与完美。他对产品与技术倾注热情，享受亲手做出一些东西的快乐，给生活带来惊喜。',
		),
		more: [
			bi(
				'His favorite saying is “Stay hungry. Stay foolish.”',
				'他最喜欢的一句话是：“Stay hungry. Stay foolish.”',
			),
		],
	},

	/** Editorial lifestyle portrait beside the home bio. */
	portrait: {
		width: 2560,
		height: 3840,
		alt: bi(
			'Siyuan Xue outdoors in light athletic wear against concrete architecture',
			'薛思远生活照：浅色运动外套，建筑庭院背景',
		),
	},

	/** A portrait revealed with a single click; collapsed on every fresh page. */
	secretPortrait: {
		mediaId: 'portrait-study',
		width: 1024,
		height: 1536,
		alt: bi('An abstract feminine silhouette with one arm raised against a misty blue background, reserved for a future portrait', '雾蓝色背景中抬手整理头发的抽象女性轮廓，为未来的肖像照片预留位置'),
		caption: bi(
			'Some stories are still in draft.',
			'有些故事还停在草稿里。',
		),
		dialogLabel: bi('Romantic Mode illustration', '心动模式插画'),
		closeLabel: bi('Close Romantic Mode illustration', '关闭心动模式插画'),
		turnOnLabel: bi('Turn on Romantic Mode', '开启心动模式'),
		turnOffLabel: bi('Turn off Romantic Mode', '关闭心动模式'),
	} satisfies SecretPortrait,

	projects: [
		{
			gallerySlug: 'imathbook',
			title: bi('iMathBook · uMathHub', 'iMathBook · uMathHub'),
			href: 'https://imathbook.com',
			year: 2025,
			external: true,
		},
		{
			gallerySlug: 'leda-agent',
			title: bi('LeDA Agent', 'LeDA 智能体'),
			href: 'https://win.bupt.edu.cn/program.do?id=9909',
			year: '2025–2026',
			external: true,
		},
		{
			gallerySlug: 'pixeldone',
			title: bi('Pixel Done', 'Pixel Done'),
			href: 'https://github.com/Siyuan-Xue/PixelDone',
			year: 2026,
			external: true,
		},
		{
			gallerySlug: 'b-spline-policy',
			title: bi('B-Spline Policy', 'B-Spline Policy'),
			href: 'https://github.com/Siyuan-Xue/openpi05-bsp',
			year: 2026,
			external: true,
		},
		{
			gallerySlug: 'bnds-life',
			title: bi('BNDS.life', 'BNDS.life'),
			href: 'https://bnds.life',
			year: 2026,
			external: true,
		},
	] satisfies LinkItem[],

	research: [
		{
			gallerySlug: 'yuheng',
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
			gallerySlug: 'walking-with-light',
			title: bi(
				'Walking with Light · as Ye Peida',
				'话剧《与光同行》· 饰 叶培大',
			),
			href: 'https://www.bupt.edu.cn/info/1079/90114.htm',
			venue: bi('BUPT 70th anniversary', '北邮70周年校庆'),
			external: true,
		},
		{
			gallerySlug: 'finding-li-bai',
			title: bi('Finding Li Bai · as Tian Bo', '话剧《寻找李白》· 饰 田波'),
			href: '/gallery/finding-li-bai/',
			external: false,
		},
		{
			gallerySlug: 'family',
			title: bi('Family · as Gao Juexin', '话剧《家》· 饰 高觉新'),
			href: '/gallery/family/',
			external: false,
		},
		{
			gallerySlug: 'volleyball',
			title: bi(
				'BUPT volleyball · university & college teams',
				'校排球队 · 院排球队',
			),
			href: WIP_HREF,
			external: false,
		},
	] satisfies LinkItem[],
};
