import { prisma } from '@briefer/database'
import { logger } from '../../../logger.js'
import fetch from 'node-fetch'
import { EventEmitter } from 'events'
import { ChatRecordStatus } from '../types/interfaces.js'
import { sanitizeInput } from '../../../utils/sanitize.js'

// 设置最大监听器数量，避免内存泄漏警告
const MAX_LISTENERS = 1000

// 创建全局事件发射器实例
export const titleUpdateEmitter = new EventEmitter()
titleUpdateEmitter.setMaxListeners(MAX_LISTENERS)


export async function summarizeUntitledChats() {
  try {
    logger().info('Starting untitled chats summarization task')

    const untitledChats = await prisma().chat.findMany({
      where: {
        isTitleSet: false,
        records: {
          none: {
            status: ChatRecordStatus.PROCESSING,
          },
          some: {
            status: ChatRecordStatus.COMPLETED,
          },
        },
      },
      include: {
        records: {
          orderBy: {
            createdTime: 'asc',
          },
          take: 5,
          where: {
            status: ChatRecordStatus.COMPLETED,
          },
        },
      },
    })

    logger().info(`Found ${untitledChats.length} untitled chats`)

    for (const chat of untitledChats) {
      try {
        // if (chat.records.length < 2) {
        //   logger().debug(`Skipping chat ${chat.id}: insufficient records`)
        //   continue
        // }

        // 构造消息格式，包含 id
        const messages = chat.records
          .map((record) => [
            {
              id: record.id,
              role: 'user',
              content: sanitizeInput(record.question),
            },
            {
              id: record.id,
              role: 'assistant',
              content: record.answer.toString(),
            },
          ])
          .flat()

        // 调用AI生成标题
        logger().info({
          msg: 'Sending request to AI Agent',
          data: {
            url: `${process.env['AI_AGENT_URL']}/v1/ai/chat/summarize`,
            body: {
              messages,
              temperature: 0,
            },
          },
        })

        const response = await fetch(`${process.env['AI_AGENT_URL']}/v1/ai/chat/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            temperature: 0,
          }),
        })

        if (!response.ok || !response.body) {
          logger().error(`Failed to get title for chat ${chat.id}: ${response.statusText}`)
          continue
        }

        // 处理 SSE 响应
        const stream = response.body
        const textDecoder = new TextDecoder()
        let completeTitle = ''

        try {
          for await (const chunk of stream) {
            const text = textDecoder.decode(chunk as Buffer, { stream: true })
            const lines = text.split('\n')

            for (const line of lines) {
              if (line.startsWith('data:')) {
                const data = line.slice(5).trim()

                if (data === '[DONE]') {
                  // 标题生成完成
                  await prisma().chat.update({
                    where: { id: chat.id },
                    data: {
                      title: completeTitle.trim(),
                      isTitleSet: true,
                      updateTime: new Date(),
                    },
                  })

                  logger().info({
                    msg: 'Chat title updated successfully',
                    data: {
                      chatId: chat.id,
                      newTitle: completeTitle.trim(),
                      messageCount: messages.length,
                    },
                  })

                  // 发送标题更新事件
                  const updateData = {
                    chatId: chat.id,
                    title: completeTitle.trim(),
                  }

                  logger().info({
                    msg: 'Emitting title update event',
                    data: updateData,
                  })

                  titleUpdateEmitter.emit('titleUpdate', updateData)

                  logger().info({
                    msg: 'Title update event emitted',
                    data: {
                      chatId: chat.id,
                      listenerCount: titleUpdateEmitter.listenerCount('titleUpdate'),
                    },
                  })

                  break
                }

                try {
                  const jsonData = JSON.parse(data)
                  const content = jsonData.choices?.[0]?.delta?.content || ''
                  if (content) {
                    completeTitle += content
                  }
                } catch (error) {
                  logger().error({
                    msg: 'Failed to parse SSE data',
                    data: {
                      chatId: chat.id,
                      rawData: data,
                      error: error instanceof Error ? error.message : 'Unknown error',
                    },
                  })
                }
              }
            }
          }
        } catch (streamError) {
          logger().error({
            msg: 'Stream processing error',
            data: {
              chatId: chat.id,
              error: streamError instanceof Error ? streamError.message : 'Unknown error',
              stack: streamError instanceof Error ? streamError.stack : undefined,
            },
          })
        }
      } catch (error) {
        logger().error({
          msg: 'Chat summarization error',
          data: {
            chatId: chat.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        })
      }
    }
  } catch (error) {
    logger().error({
      msg: 'Untitled chats summarization task error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
    })
    throw error
  }
}

// 启动周期性任务
export function startTitleSummarizationTask() {
  const INTERVAL = 10000 // 10秒

  logger().info('Starting title summarization task scheduler')

  setInterval(summarizeUntitledChats, INTERVAL)

  // 立即执行一次
  summarizeUntitledChats()
}
