
import { NewsItem, Notification, LostItem, NavItem } from './types';

export interface Activity {
  id: string;
  title: string;
  date: string;
  location: string;
  organizer: string;
  image: string;
  category: string;
  description: string;
  status: '报名中' | '进行中' | '已结束';
}

export const NAV_ITEMS: NavItem[] = [
  { label: '首页', path: '/', icon: 'home' },
  { label: '课程通知', path: '/notifications', icon: 'school' },
  { label: '活动公告', path: '/activities', icon: 'campaign' },
  { label: '失物招领', path: '/lost-and-found', icon: 'search' },
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act1',
    title: '2023 校园春季音乐节',
    date: '2023年11月15日 19:00',
    location: '大礼堂',
    organizer: '学生艺术团',
    image: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=2070&auto=format&fit=crop',
    category: '文艺',
    description: '汇集校园顶尖乐队与歌手，为你带来一场视听盛宴。现场更有抽奖环节！',
    status: '报名中'
  },
  {
    id: 'act2',
    title: '人工智能前沿技术讲座',
    date: '2023年11月18日 14:30',
    location: '图书馆报告厅',
    organizer: '计算机学院',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop',
    category: '讲座',
    description: '特邀行业专家深入探讨生成式AI的未来发展及其对社会的影响。',
    status: '进行中'
  },
  {
    id: 'act3',
    title: '校园马拉松接力赛',
    date: '2023年11月20日 08:00',
    location: '北操场',
    organizer: '体育部',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=2070&auto=format&fit=crop',
    category: '体育',
    description: '挥洒汗水，展现团队力量。欢迎各院系组队报名参加。',
    status: '报名中'
  },
  {
    id: 'act4',
    title: '创新创业大赛决赛',
    date: '2023年11月25日 13:00',
    location: '学生活动中心',
    organizer: '校团委',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=2070&auto=format&fit=crop',
    category: '科创',
    description: '见证校园最有创意的项目路演，谁将摘得最后的桂冠？',
    status: '已结束'
  }
];

export const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    tag: '重要',
    tagColor: 'bg-blue-100 text-blue-700',
    time: '2小时前',
    title: '期末周图书馆开放时间延长',
    description: '为了支持同学们准备期末考试，主图书馆将从下周一开始实行24/7全天候开放。',
    author: {
      name: '行政处',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRXnNGLxZr6QrOYWk0xHKGd53dZm65uHPDQ79w9qM1Ozqd0t2D8C67f6mnlzYZ2-QksqtVwxH-B1qgLrutvHolhSkqjRMN6j9EBJ-DCmKaXuG5tSDL4JiXweeK2Cprks6Ob0wfcVHsBEEsUhMjaH_XSXk8xJAucpRiyestt4n4HxqDRY1wbsNDBI1r_myh4TYYMGBaLBv2U-T5BGJASlnlQmyMmRJ9khMSVbW-olvL7chMoLia-RaxqQuQXIdq3dE3u_f5G0dSPBw4'
    }
  },
  {
    id: '2',
    tag: '体育',
    tagColor: 'bg-emerald-100 text-emerald-700',
    time: '5小时前',
    title: '足球队选拔：秋季赛季',
    description: '本周五下午4点在北操场集合。欢迎所有水平的同学参加。请带上你的装备！',
    author: {
      name: '麦克教练',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzKjIxc0t7mtWOh2nhL3em64QdPx1WlTZD1jCPTqAQ6WGFU8ErjorZmLQ-8GWtBoOT4bIj6Sp0ok4pug0jOjwUriEUVB_oeRHbqT-d5totcTR_w_dc4JA3tT1G-XgjkSEgqoSySW20Rvwu5x5wMsl1UWeQM7gMrNuYJlEx0O14-DWvb3jU5xIr3qBXcssG-mnLFR_jniNG9-IXZKLrpEEp3fiROSp17khspjwfIxNWsrNkN1uEPS9SjktSGtkXDDTEgGaKqtgYUFqp'
    }
  },
  {
    id: '3',
    tag: '失物招领',
    tagColor: 'bg-amber-100 text-amber-700',
    time: '1天前',
    title: '招领：蓝色水壶',
    description: '在B教学楼第4排附近发现一个蓝色金属水壶。上面贴有贴纸。',
    author: {
      name: '学生会',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGZmeJ0BjJm_IDma1rxi40kGAJwekqDmbzmcH0h0AfjN92roRGOMLm5q7s72kI7TTlbcof7rBSMxU0VjGsCAayhpo16QsPI72FkHVzGLR-FnI3vTmqcpf_8KDjJn_pj7cD_WYI4wpQQbD4YgjVDI8RcRiOH9dzh6dzjpEW5xGcLC1MfvMUCsXQp7HGF6MvFR31TrBmYIE9lm37iLZ9m7IHZ8surIhAB46FdKUcuuu0WkwqjW_1kiS3_VS5Zk4tfDb5mPZRKg9tzqAY'
    }
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    course: 'CS 101: 计算机科学导论',
    isImportant: true,
    time: '2小时前',
    title: '期中考试时间调整通知',
    content: '由于科学楼突发停电，原定于本周五的期中考试已推迟至下周一上午10:00。请查看更新后的教学大纲。',
    author: 'Alan Grant 教授',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-ZvYirqFjtaFZMLdvCWeZKIxlf67vb9ikVWU-UGOQZN7ADH6VQ32vtiEEcl9hOS_pTMeijQl_LqmOmviFNu-Bw_Elm6VHmp6InKy-I1hs0nwU74Wu1MBAclVSTGTy2b7-YFZWBp2Tm0v7cUJ38B0OCqXt3ePF6TQU9dBEn6T5b2bSj8k-csuFgWl8jnryjdN_8NuL_0gmVB4H8CrrCk2bwhUgPWIYstwpEklnckNpnWSO-W1fV6QqhV3ZnmOBEt3sWHak7H68cCYb',
    location: '主楼 304 教室'
  },
  {
    id: '2',
    course: 'ART 204: 现代设计',
    isImportant: false,
    time: '5小时前',
    title: '项目提交截止日期延长',
    content: '大家好，我收到了多份关于延长最终项目截止日期的申请。现将截止日期推迟至周日午夜。祝大家好运！',
    author: 'Frizzle 女士',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYhFIb0YzfasV6ahUB9YXBPVNIYUo-EqAfvOXfMuel50F8rBE811BjGxQGVFM70Q9lSpswveIwJlkwEWLVFmgLlby2lMw0DeotDL6RqnX0E0br0MxlpKUu_GnQ5hIFlV0yoK8f9_AMj0cVPbXfQwtWBIRGtc3BZfALMPRB0GdRDBfhoeBkdkGvgxx4OVGIlfRz0MT-v0K1Y_fXE5huFqRK4aSkRSiBYzG4n_zC51gGeWff6Trx8_FsfkzjcS8ZXPW7Q0Q4ZkIkDXsq',
    location: '在线门户'
  }
];

export const MOCK_LOST_ITEMS: LostItem[] = [
  {
    id: 'airpods-pro-2',
    type: 'lost',
    category: '电子数码',
    title: '苹果 AirPods Pro 耳机 (第二代)',
    time: '2023年10月24日 下午 2:00',
    location: '学生活动中心 二楼餐厅',
    description: '复习化学期中考时，我把耳机忘在了窗边的桌子上。充电盒正面有明显的“S.K.”刻字。盒子右下角有一处小划痕。请好心人归还，谢谢！',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA0KPC44vTQPzqH6U4NiWs4g1ihyMBUFXxi2DoespSBieI02KMESj5XtPAzD6rljWRj6jLSqvNhectVzUBumS2kf1HGdDmHMWdxbEQCVXSU_dfjKmMfOzNJ41BGNzY2t6qNfFUVAiEOxTYor7fCBNpJQIUlKP0h6GHw1XDRQYSqMrP2Ltx2s6ltWetqpDnH9Z7IPv6bl4TjauWGoVTZnrvJNZ5hHhD24I3LtxXkZ7wjMsXAo4HSEt3fXd8wjAHrCp1Co7j61UL4vGos',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuABTkl779f4dQsBtxTnwEZ0qfHoTBhj25Y5HTw-Isx0c8UEdPsrX2pbrYwPxm9iUMG0iaZ42F6E0zPHUMjjPNWb0rKUpQgHA8skZEjVDJB0aDbGZvXDnRd4gA3EAn7zQ2YuG7ouiPv4CJh2-d4tXbwhxp0DSXzTTZBHa-IbgZr3bcIer5D-WJ4yjCNs0qhl3mK-0OYXAFNBLqJA0Ml93LELb7th5vqpbWsbp9q05lhmFfHBjxDogWCXekfO5B-B20LPH5QdqzCXMYlR',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDpRGE7jKYXtF6hqxwVc8qECbGC_DyJ0A5vFvpU0smhyM6lXz4_h_TMQxy63qkPUILGY_5VycE2LvDc-tO3s0XlbZ2Deks65w0X84Y85tMFn-xRTm9EyNrrYv2mBGWE0p9tQzE7p6Ox9-b1m_gSozva4xSpxoxLqdhX-TVeeLzxg_s0KwKV7VBdcl06xdwtQDdERmqoiz-5Aoe_8dIPzGWqT2jq5f9DTcR5I_uOR0RpnNjUJK-RSCIk3AZENL0KVMsCcHOTOXSg1DWA'
    ],
    tags: ['白色', '电子产品', '有刻字'],
    publisher: {
      name: 'Sarah K.',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIYLcX79FyX_RbOCTxnVnOCmSELTTpIS12-Wumz0Hm5tjnS4Kz2lU2vs2CCtyxD2MREB3gzE3IIB4HrDdHHUD1SoloWcljyc79lFJot4gJarxa5ZnfYR73JvCBRYLqaBnJWplnfeLo6bF9WV6aeAb6JkYu_33HlG4QpB4aYXU0aSd4QRcAks8Dwe0R6hDpEKC4-GkOLmJO0YaN_eWmVgvlN3fR-P1bNbf3-m4V3mndtvC-3ZjlMfqN2xAnEna-3FCyDWPY18bXLZNm'
    }
  }
];
