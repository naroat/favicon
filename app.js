const { createApp, ref } = Vue
const { createI18n } = VueI18n

const i18n = createI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages
})

const app = createApp({
    setup() {
        const url = ref('')
        const result = ref({
            icons: [],
            keywords: '',
            description: '',
            pageTitle: ''
        })
        const loading = ref(false)
        const error = ref('')
        const currentLocale = ref(i18n.global.locale)
        const copyTip = ref('')

        const changeLocale = (locale) => {
            i18n.global.locale = locale
            currentLocale.value = locale
        }

        const copyToClipboard = async (text) => {
            try {
                await navigator.clipboard.writeText(text)
                copyTip.value = i18n.global.t('copySuccess')
                setTimeout(() => {
                    copyTip.value = ''
                }, 2000)
            } catch (err) {
                console.error('Failed to copy:', err)
            }
        }

        const formatUrl = (input) => {
            let url = input.trim()
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url
            }
            try {
                const urlObj = new URL(url)
                if (urlObj.pathname === '') {
                    url += '/'
                }
                return url
            } catch (e) {
                throw new Error('invalid_url')
            }
        }

        const getFaviconAndMeta = async () => {
            if (!url.value) {
                error.value = i18n.global.t('inputRequired')
                return
            }

            loading.value = true
            error.value = ''
            result.value = {
                icons: [],
                keywords: '',
                description: '',
                pageTitle: ''
            }
            
            try {
                const formattedUrl = formatUrl(url.value)
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(formattedUrl)}`
                const response = await fetch(proxyUrl)
                const data = await response.json()
                
                if (data.status?.http_code !== 200) {
                    throw new Error('fetch_failed')
                }

                const parser = new DOMParser()
                const doc = parser.parseFromString(data.contents, 'text/html')

                const pageTitle = doc.querySelector('title')?.textContent || i18n.global.t('noTitle')

                // 更新图标选择器，按尺寸排序
                const iconSelectors = [
                    { selector: 'link[sizes="512x512"]', defaultSize: '512x512' },
                    { selector: 'link[sizes="256x256"]', defaultSize: '256x256' },
                    { selector: 'link[sizes="192x192"]', defaultSize: '192x192' },
                    { selector: 'link[sizes="180x180"]', defaultSize: '180x180' },
                    { selector: 'link[sizes="128x128"]', defaultSize: '128x128' },
                    { selector: 'link[sizes="96x96"]', defaultSize: '96x96' },
                    { selector: 'link[sizes="64x64"]', defaultSize: '64x64' },
                    { selector: 'link[sizes="32x32"]', defaultSize: '32x32' },
                    { selector: 'link[sizes="16x16"]', defaultSize: '16x16' },
                    { selector: 'link[rel="icon"]', defaultSize: 'default' },
                    { selector: 'link[rel="shortcut icon"]', defaultSize: 'default' },
                    { selector: 'link[rel="apple-touch-icon"]', defaultSize: '180x180' },
                    { selector: 'link[rel="apple-touch-icon-precomposed"]', defaultSize: '180x180' }
                ]

                const icons = []
                iconSelectors.forEach(({selector, defaultSize}) => {
                    const elements = doc.querySelectorAll(selector)
                    elements.forEach(el => {
                        const href = el.getAttribute('href')
                        if (href) {
                            const size = el.getAttribute('sizes') || defaultSize
                            const type = el.getAttribute('rel') || 'icon'
                            icons.push({
                                url: href.startsWith('http') ? href : new URL(href, formattedUrl).href,
                                size: size,
                                type: type
                            })
                        }
                    })
                })

                // 添加默认 favicon.ico
                const defaultIcon = `${new URL(formattedUrl).origin}/favicon.ico`
                icons.push({
                    url: defaultIcon,
                    size: '16x16',
                    type: 'icon'
                })

                // 去重并按尺寸排序
                const uniqueIcons = Array.from(new Set(icons.map(icon => icon.url)))
                    .map(url => icons.find(icon => icon.url === url))
                    .filter(icon => icon.url.startsWith('http'))
                    .sort((a, b) => {
                        const sizeA = parseInt(a.size.split('x')[0]) || 0
                        const sizeB = parseInt(b.size.split('x')[0]) || 0
                        return sizeB - sizeA
                    })

                const keywords = doc.querySelector('meta[name="keywords"]')?.content || i18n.global.t('noKeywords')
                const description = doc.querySelector('meta[name="description"]')?.content || i18n.global.t('noDescription')

                result.value = {
                    icons: uniqueIcons,
                    keywords,
                    description,
                    pageTitle
                }
            } catch (e) {
                error.value = e.message === 'invalid_url'
                    ? i18n.global.t('invalidUrl')
                    : i18n.global.t('fetchError')
                console.error(e)
            } finally {
                loading.value = false
            }
        }

        // 添加示例网站数组
        const examples = [
            { name: 'GitHub', url: 'github.com' },
            { name: 'Stack Overflow', url: 'stackoverflow.com' },
            { name: 'Microsoft', url: 'microsoft.com' },
            { name: 'Apple', url: 'apple.com' },
            { name: 'Amazon', url: 'amazon.com' },
            { name: 'Google', url: 'google.com' }
        ]

        // 添加示例点击处理函数
        const tryExample = (exampleUrl) => {
            url.value = exampleUrl
            getFaviconAndMeta()
        }

        return {
            url,
            result,
            loading,
            error,
            getFaviconAndMeta,
            currentLocale,
            changeLocale,
            copyToClipboard,
            copyTip,
            examples,  // 添加到返回值
            tryExample // 添加到返回值
        }
    },
    template: `
        <div class="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100 flex flex-col">
            <div class="container mx-auto px-4 py-12 flex-grow">
                <!-- 语言切换 -->
                <div class="flex justify-end mb-8">
                    <button 
                        @click="changeLocale(currentLocale === 'zh' ? 'en' : 'zh')"
                        class="flex items-center space-x-2 px-4 py-2 rounded-full bg-white shadow-sm hover:shadow-md transition-all duration-300"
                    >
                        <span class="text-purple-600">{{ currentLocale === 'zh' ? 'English' : '中文' }}</span>
                    </button>
                </div>

                <!-- 标题区域 -->
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-bold text-purple-800 mb-4">{{ $t('title') }}</h1>
                    <p class="text-purple-600">{{ $t('subTitle') }}</p>
                </div>
                
                <!-- 输入区域 -->
                <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 mb-8">
                    <div class="flex gap-4 mb-6">
                        <input 
                            v-model="url"
                            type="text"
                            :placeholder="$t('inputPlaceholder')"
                            class="flex-1 px-6 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            @keyup.enter="getFaviconAndMeta"
                        >
                        <button 
                            @click="getFaviconAndMeta"
                            :disabled="loading"
                            class="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-purple-300 transition-colors duration-300"
                        >
                            {{ loading ? $t('fetching') : $t('fetch') }}
                        </button>
                    </div>

                    <!-- 示例区域 -->
                    <div class="mt-6">
                        <p class="text-sm text-purple-600 mb-3">{{ $t('tryExamples') }}</p>
                        <div class="flex flex-wrap gap-2">
                            <button
                                v-for="example in examples"
                                :key="example.url"
                                @click="tryExample(example.url)"
                                class="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors duration-300"
                                :disabled="loading"
                            >
                                {{ example.name }}
                            </button>
                        </div>
                    </div>

                    <div v-if="error" class="mt-4 text-red-500 text-center">{{ error }}</div>
                </div>

                <!-- 结果区域 -->
                <div v-if="result.pageTitle || (result.icons && result.icons.length) || result.keywords || result.description" 
                     class="max-w-3xl mx-auto space-y-6">
                    
                    <!-- 网站标题卡片 -->
                    <div v-if="result.pageTitle" 
                         class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                        <h2 class="text-xl font-semibold text-purple-800 mb-4">{{ $t('pageTitle') }}</h2>
                        <div class="relative group">
                            <p class="text-purple-700 leading-relaxed pr-10">{{ result.pageTitle }}</p>
                            <button 
                                @click="copyToClipboard(result.pageTitle)"
                                class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-600 hover:text-purple-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- 图标卡片 -->
                    <div v-if="result.icons && result.icons.length" 
                         class="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
                        <h2 class="text-xl font-semibold text-purple-800 mb-6">{{ $t('favicon') }}</h2>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div v-for="(icon, index) in result.icons" 
                                 :key="index"
                                 class="bg-purple-50 rounded-xl p-6 hover:bg-purple-100 transition-all duration-300 group"
                            >
                                <div class="flex flex-col items-center space-y-4">
                                    <!-- 图标预览区 -->
                                    <div class="relative w-full aspect-square bg-white rounded-lg shadow-inner flex items-center justify-center p-4 group-hover:shadow-md transition-all duration-300">
                                        <img :src="icon.url" 
                                             :alt="'Favicon ' + icon.size" 
                                             class="max-w-full max-h-full object-contain"
                                             @error="$event.target.parentElement.innerHTML='<span class=\\'text-purple-400 text-sm\\'>图标加载失败</span>'"
                                        >
                                    </div>
                                    
                                    <!-- 尺寸和类型标签 -->
                                    <div class="flex flex-wrap gap-2 justify-center">
                                        <span class="bg-purple-200 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                                            {{ icon.size }}
                                        </span>
                                        <span class="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm">
                                            {{ icon.type }}
                                        </span>
                                    </div>
                                    
                                    <!-- URL输入框和复制按钮 -->
                                    <div class="w-full relative group/url">
                                        <input 
                                            type="text" 
                                            :value="icon.url" 
                                            readonly 
                                            class="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg pr-10 truncate cursor-pointer hover:border-purple-400 transition-colors duration-300"
                                        >
                                        <button 
                                            @click="copyToClipboard(icon.url)"
                                            class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/url:opacity-100 transition-opacity duration-300"
                                            :title="$t('copyTip')"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-600 hover:text-purple-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 关键词卡片 -->
                    <div v-if="result.keywords" 
                         class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                        <h2 class="text-xl font-semibold text-purple-800 mb-4">{{ $t('keywords') }}</h2>
                        <p class="text-purple-700 leading-relaxed">{{ result.keywords }}</p>
                    </div>

                    <!-- 描述卡片 -->
                    <div v-if="result.description" 
                         class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                        <h2 class="text-xl font-semibold text-purple-800 mb-4">{{ $t('description') }}</h2>
                        <p class="text-purple-700 leading-relaxed">{{ result.description }}</p>
                    </div>
                </div>
            </div>

            <!-- 简化的底部版权信息 -->
            <footer class="py-6 text-center text-sm text-purple-600">
                <p>{{ $t('copyright') }}</p>
            </footer>

            <!-- 复制提示 -->
            <div v-if="copyTip" 
                 class="fixed bottom-4 right-4 bg-purple-900 text-white px-6 py-3 rounded-xl shadow-lg transform transition-all duration-300 ease-out">
                <div class="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{{ copyTip }}</span>
                </div>
            </div>
        </div>
    `
})

app.use(i18n)
app.mount('#app') 