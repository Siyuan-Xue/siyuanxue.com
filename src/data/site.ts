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

const name = bi('Siyuan Xue', '薛思远');

export const site = {
	name,
	/** Short brand for <title> fallback */
	title: bi('Siyuan Xue', '薛思远'),
	homeTitle: bi('Siyuan Xue（薛思远）｜Personal Website', '薛思远（Siyuan Xue）｜个人网站'),
	github: 'https://github.com/Siyuan-Xue',
	description: bi(
		'Siyuan Xue (薛思远), studying Intelligence Science and Technology at BUPT and continuing his master’s studies at the School of Information and Communication Engineering, driven to explore the unknown and pursue excellence and perfection.',
		'薛思远（Siyuan Xue）的个人网站。就读于北京邮电大学智能科学与技术专业，并将在信息与通信工程学院继续攻读硕士学位，热衷于探索未知，追求极致与完美。',
	),

	/** Interface copy. Every visible or accessible label is authored here as an en/zh pair. */
	ui: {
		showActions: bi('Show actions', '展开操作'),
		hideActions: bi('Hide actions', '收起操作'),
		backToTop: bi('Back to top', '回到顶部'),
		home: bi('Home', '首页'),
		backHome: bi('Back home', '返回首页'),
		blog: bi('Blog', '博客'),
		projects: bi('Projects', '项目'),
		research: bi('Research', '研究'),
		appearances: bi('Interests', '兴趣爱好'),
		inPreparation: bi('In preparation', '整理中'),
		switchToLight: bi('Switch to light mode', '切换到浅色模式'),
		switchToDark: bi('Switch to dark mode', '切换到深色模式'),
		contents: bi('Contents', '目录'),
		openContents: bi('Open contents', '打开目录'),
		closeContents: bi('Close contents', '关闭目录'),
		loading: bi('Loading', '加载中'),
		notFound: bi('Page not found', '页面未找到'),
		notFoundDetail: bi('This page does not exist.', '这个页面不存在。'),
		underConstruction: bi('Under construction…', '正在施工...'),
		redirecting: bi('Redirecting', '正在跳转'),
		imageLoadError: bi('The image could not be loaded. Please try again.', '图片加载失败，请重试。'),
	},

	gallery: {
		role: bi('Role', '角色'),
		videos: bi('Videos', '视频'),
		simulationResults: bi('Simulation results', '模拟器结果'),
		videoFallback: bi('Your browser cannot play this video. Use the download link below.', '浏览器无法播放此视频时，可使用下方链接下载。'),
		downloadVideo: bi('Download video', '下载视频'),
		realRobot: bi('Real robot experiments', '真机实验'),
		related: bi('Related material', '相关资料'),
	},

	bio: {
		lead: bi(
			'Siyuan Xue studies Intelligence Science and Technology at Beijing University of Posts and Telecommunications, and will continue his master’s studies at the School of Information and Communication Engineering. He is driven to explore the unknown and pursue excellence and perfection.',
			'薛思远就读于北京邮电大学智能科学与技术专业，并将在信息与通信工程学院继续攻读硕士学位。他热衷于探索未知，追求极致与完美。',
		),
		more: [
			bi(
				'“Stay hungry. Stay foolish.”',
				'“Stay hungry. Stay foolish.”',
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
