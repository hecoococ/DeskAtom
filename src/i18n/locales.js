const zh = {
  app: {
    addTaskPlaceholder: '添加新任务...',
    addTaskTitle: '添加任务',
    emptyError: '任务内容不能为空！',
    taskStats: '任务统计',
    completePercent: '% 完成',
    total: '总计',
    completed: '已完成',
    progressCompleted: '已完成 ',
    progressDetail: '已完成{completed}个/总共{total}个任务',
    totalSuffix: '总共{count}个任务',
    pending: '未完成',
    focusModeTitle: '进入专注模式',
    focusModeBtn: '任务专注',
    clearAllTitle: '清空所有任务',
    filterAll: '全部',
    filterPending: '未完成',
    filterCompleted: '已完成',
    allGroups: '所有任务',
    createGroup: '新建分组',
    createGroupPrompt: '请输入新分组名称',
    renameGroup: '重命名分组',
    renameGroupPrompt: '请输入新的分组名称',
    deleteGroup: '删除分组',
    deleteGroupWithTasksConfirm: '是否同时删除“{name}”中只属于该分组的任务？取消则仅删除分组，并把这些任务移入收件箱。',
    deleteGroupTitle: '删除分组',
    deleteGroupDesc: '请选择如何处理“{name}”。属于多个分组的任务只会移除这个分组。',
    deleteGroupOnly: '仅删除分组',
    deleteGroupAndTasks: '删除分组及里面的任务',
    taskGroupsTitle: '任务分组',
    noTasks: '暂无任务',
    noTasksDesc: '添加您的第一个任务开始吧！',
    inputTaskPlaceholder: '输入任务内容...',
    confirmClearAll: '确定要清空所有 {count} 个任务吗？',
    confirmDelete: '确定删除此任务？'
  },
  settings: {
    title: '设置',
    darkMode: '暗夜模式',
    darkModeToggle: '切换暗夜模式',
    themeColor: '主题颜色',
    colorSingle: '单色',
    colorDual: '双色',
    primaryColor: '主色',
    secondaryColor: '辅色',
    windowOpacity: '窗口透明度',
    glassBlur: '毛玻璃模糊度',
    voiceService: '阿里云语音服务',
    accessKeyIdLabel: 'AccessKey ID',
    accessKeyIdPlaceholder: '请输入访问密钥ID',
    accessKeySecretLabel: 'AccessKey Secret',
    accessKeySecretPlaceholder: '请输入访问密钥密码',
    appKeyLabel: 'AppKey',
    appKeyPlaceholder: '请输入AppKey',
    saveConfig: '保存配置',
    openTestPage: '打开测试页面',
    resetDefaults: '恢复默认设置',
    language: '语言',
    fillAccessKeys: '请填写 AccessKey ID 和 AccessKey Secret',
    fillAppKey: '请填写 AppKey',
    voiceConfigSaved: '语音配置已保存',
    loadVoiceConfigFailed: '加载语音配置失败:',
    loadSettingsFailed: '加载设置失败:'
  },
  focusMode: {
    markComplete: '标记完成',
    deleteTask: '删除任务',
    allDone: '太棒了！所有任务都已完成',
    backToMain: '返回主界面'
  },
  todoItem: {
    statusCompleted: '完成',
    statusPending: '未完成',
    editTask: '编辑任务',
    manageGroups: '管理分组',
    deleteTask: '删除任务',
    cancel: '取消',
    save: '保存'
  },
  dialog: {
    confirmDelete: '确认删除',
    cancel: '取消',
    confirm: '确定'
  },
  titleBar: {
    settings: '设置',
    minimize: '隐藏到边缘',
    close: '关闭应用'
  },
  voiceInput: {
    configureFirst: '请先配置阿里云语音服务',
    connecting: '正在连接...',
    clickStop: '点击停止录音',
    clickStart: '点击开始语音输入',
    electronApiUnavailable: 'electronAPI 不可用',
    tokenFailed: '获取 Token 失败',
    startFailed: '启动失败'
  },
  colorSchemes: {
    deskatom: 'DeskAtom',
    sky: '天空蓝',
    purple: '紫粉',
    coral: '珊瑚橙',
    mint: '薄荷绿',
    ocean: '海洋蓝',
    indigo: '靛蓝紫',
    cyber: '赛博'
  }
}

const en = {
  app: {
    addTaskPlaceholder: 'Add a new task...',
    addTaskTitle: 'Add Task',
    emptyError: 'Task content cannot be empty!',
    taskStats: 'Task Statistics',
    completePercent: '% Complete',
    total: 'Total',
    completed: 'Completed',
    progressCompleted: 'Done ',
    progressDetail: '{completed} done / total {total} tasks',
    totalSuffix: 'total {count} tasks',
    pending: 'Pending',
    focusModeTitle: 'Enter Focus Mode',
    focusModeBtn: 'Focus Mode',
    clearAllTitle: 'Clear All Tasks',
    filterAll: 'All',
    filterPending: 'Pending',
    filterCompleted: 'Completed',
    allGroups: 'All Tasks',
    createGroup: 'New Group',
    createGroupPrompt: 'Enter a new group name',
    renameGroup: 'Rename Group',
    renameGroupPrompt: 'Enter the new group name',
    deleteGroup: 'Delete Group',
    deleteGroupWithTasksConfirm: 'Also delete tasks that only belong to "{name}"? Cancel will delete only the group and move those tasks to Inbox.',
    deleteGroupTitle: 'Delete Group',
    deleteGroupDesc: 'Choose how to handle "{name}". Tasks in multiple groups will only lose this group.',
    deleteGroupOnly: 'Delete Group Only',
    deleteGroupAndTasks: 'Delete Group and Tasks',
    taskGroupsTitle: 'Task Groups',
    noTasks: 'No Tasks',
    noTasksDesc: 'Add your first task to get started!',
    inputTaskPlaceholder: 'Enter task content...',
    confirmClearAll: 'Are you sure you want to clear all {count} tasks?',
    confirmDelete: 'Are you sure you want to delete this task?'
  },
  settings: {
    title: 'Settings',
    darkMode: 'Dark Mode',
    darkModeToggle: 'Toggle Dark Mode',
    themeColor: 'Theme Color',
    colorSingle: 'Single',
    colorDual: 'Dual',
    primaryColor: 'Primary',
    secondaryColor: 'Secondary',
    windowOpacity: 'Window Opacity',
    glassBlur: 'Glass Blur',
    voiceService: 'Alibaba Cloud Voice Service',
    accessKeyIdLabel: 'AccessKey ID',
    accessKeyIdPlaceholder: 'Enter AccessKey ID',
    accessKeySecretLabel: 'AccessKey Secret',
    accessKeySecretPlaceholder: 'Enter AccessKey Secret',
    appKeyLabel: 'AppKey',
    appKeyPlaceholder: 'Enter AppKey',
    saveConfig: 'Save Config',
    openTestPage: 'Open Test Page',
    resetDefaults: 'Restore Defaults',
    language: 'Language',
    fillAccessKeys: 'Please fill in AccessKey ID and AccessKey Secret',
    fillAppKey: 'Please fill in AppKey',
    voiceConfigSaved: 'Voice config saved',
    loadVoiceConfigFailed: 'Failed to load voice config:',
    loadSettingsFailed: 'Failed to load settings:'
  },
  focusMode: {
    markComplete: 'Mark Complete',
    deleteTask: 'Delete Task',
    allDone: 'Awesome! All tasks completed',
    backToMain: 'Back to Main'
  },
  todoItem: {
    statusCompleted: 'Done',
    statusPending: 'Pending',
    editTask: 'Edit Task',
    manageGroups: 'Manage Groups',
    deleteTask: 'Delete Task',
    cancel: 'Cancel',
    save: 'Save'
  },
  dialog: {
    confirmDelete: 'Confirm Delete',
    cancel: 'Cancel',
    confirm: 'Confirm'
  },
  titleBar: {
    settings: 'Settings',
    minimize: 'Hide to Edge',
    close: 'Close App'
  },
  voiceInput: {
    configureFirst: 'Please configure Alibaba Cloud Voice Service first',
    connecting: 'Connecting...',
    clickStop: 'Click to stop recording',
    clickStart: 'Click to start voice input',
    electronApiUnavailable: 'electronAPI unavailable',
    tokenFailed: 'Failed to get Token',
    startFailed: 'Start failed'
  },
  colorSchemes: {
    deskatom: 'DeskAtom',
    sky: 'Sky Blue',
    purple: 'Purple Pink',
    coral: 'Coral Orange',
    mint: 'Mint Green',
    ocean: 'Ocean Blue',
    indigo: 'Indigo Purple',
    cyber: 'Cyber'
  }
}

export const locales = { zh, en }

export const localeNames = {
  zh: '中文',
  en: 'English'
}
