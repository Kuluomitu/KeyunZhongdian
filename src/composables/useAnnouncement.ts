import { ref, reactive } from 'vue'
import { useTrainStore } from '../store/train'

// 定义语音播报接口
export interface SpeakerStatus {
  connected: boolean
  error: string | null
  currentDevice: string | null
}

// 音频设备接口
export interface AudioDevice {
  deviceId: string
  label: string
  kind: string
  groupId: string
}

export function useAnnouncement() {
  const speakerStatus = ref<SpeakerStatus>({
    connected: false,
    error: null,
    currentDevice: null
  })
  
  // 可用的音频输出设备列表
  const audioDevices = ref<AudioDevice[]>([])
  // 是否正在加载设备列表
  const loadingDevices = ref(false)

  // 获取所有可用的音频输出设备
  const getAudioDevices = async (): Promise<AudioDevice[]> => {
    try {
      loadingDevices.value = true
      
      // 检查浏览器是否支持该API
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('浏览器不支持音频设备检测')
      }
      
      // 需要先请求媒体权限
      await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // 获取所有设备
      const devices = await navigator.mediaDevices.enumerateDevices()
      
      // 过滤出音频输出设备
      const outputDevices = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `扬声器 ${device.deviceId.substring(0, 5)}...`,
          kind: device.kind,
          groupId: device.groupId
        }))
      
      // 更新设备列表
      audioDevices.value = outputDevices
      
      console.log('检测到的音频输出设备:', outputDevices)
      return outputDevices
    } catch (error) {
      console.error('获取音频设备列表失败:', error)
      return []
    } finally {
      loadingDevices.value = false
    }
  }

  // 尝试连接默认喇叭设备
  const connectSpeaker = async (): Promise<boolean> => {
    try {
      // 先获取可用设备列表
      const devices = await getAudioDevices()
      
      if (devices.length === 0) {
        throw new Error('未检测到音频输出设备')
      }
      
      // 默认使用第一个设备
      const defaultDevice = devices[0]
      return await connectSpecificSpeaker(defaultDevice.deviceId)
    } catch (error) {
      speakerStatus.value.connected = false
      speakerStatus.value.error = error instanceof Error ? error.message : '未知错误'
      speakerStatus.value.currentDevice = null
      console.error('喇叭设备连接失败:', error)
      return false
    }
  }

  // 连接指定的喇叭设备
  const connectSpecificSpeaker = async (deviceId: string): Promise<boolean> => {
    try {
      // 检查设备是否在列表中
      const device = audioDevices.value.find(d => d.deviceId === deviceId)
      
      if (!device) {
        throw new Error(`设备ID ${deviceId} 不存在`)
      }
      
      // 这里是真实环境中需要的设备连接代码
      // 在Web环境下可以使用Web Audio API或者设置HTMLAudioElement的sinkId
      // 例如：audio.setSinkId(deviceId)
      
      // 模拟连接成功
      speakerStatus.value.connected = true
      speakerStatus.value.error = null
      speakerStatus.value.currentDevice = device.label
      
      console.log(`喇叭设备 ${device.label} 连接成功`)
      return true
    } catch (error) {
      speakerStatus.value.connected = false
      speakerStatus.value.error = error instanceof Error ? error.message : '未知错误'
      speakerStatus.value.currentDevice = null
      console.error('指定喇叭设备连接失败:', error)
      return false
    }
  }

  // 断开喇叭设备连接
  const disconnectSpeaker = (): void => {
    // 这里应该是实际断开喇叭设备连接的代码
    speakerStatus.value.connected = false
    speakerStatus.value.currentDevice = null
    console.log('已断开喇叭设备连接')
  }

  // 使用Web Audio API播放声音
  const playAudio = async (text: string): Promise<boolean> => {
    if (!speakerStatus.value.connected) {
      return false
    }

    try {
      // 使用Web Speech API实现语音合成
      const utterance = new SpeechSynthesisUtterance(text)
      
      // 设置中文语音
      utterance.lang = 'zh-CN'
      
      // 语速设置为稍慢一些，使旅客能清晰听到
      utterance.rate = 0.9
      
      // 播放语音
      window.speechSynthesis.speak(utterance)
      
      return true
    } catch (error) {
      console.error('语音播放失败:', error)
      return false
    }
  }

  // 播报开检提醒
  const announceTicketCheck = async (trainNo: string, cardNo?: string): Promise<boolean> => {
    if (!speakerStatus.value.connected) {
      const connected = await connectSpeaker()
      if (!connected) {
        return false
      }
    }

    const trainStore = useTrainStore()
    const train = trainStore.getTrainByNo(trainNo)

    if (!train) {
      console.error(`找不到车次 ${trainNo} 的信息`)
      return false
    }

    try {
      // 构建播报文本，改为 "某某号牌的旅客，请注意，某某次列车准备开检"
      const text = cardNo 
        ? `${cardNo}号牌的旅客，请注意，${trainNo}次列车准备开检。` 
        : `${trainNo}次列车旅客请注意，列车准备开检。`;
      
      // 模拟播报
      console.log('播报内容:', text)
      
      // 实际播放声音
      return await playAudio(text)
    } catch (error) {
      console.error('语音播报失败:', error)
      return false
    }
  }

  // 播报自定义内容
  const announceCustom = async (text: string): Promise<boolean> => {
    if (!speakerStatus.value.connected) {
      const connected = await connectSpeaker()
      if (!connected) {
        return false
      }
    }

    try {
      // 模拟播报
      console.log('播报自定义内容:', text)
      
      // 实际播放声音
      return await playAudio(text)
    } catch (error) {
      console.error('语音播报失败:', error)
      return false
    }
  }

  return {
    speakerStatus,
    audioDevices,
    loadingDevices,
    getAudioDevices,
    connectSpeaker,
    connectSpecificSpeaker,
    disconnectSpeaker,
    announceTicketCheck,
    announceCustom
  }
} 