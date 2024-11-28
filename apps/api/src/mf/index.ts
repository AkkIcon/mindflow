import { Router } from 'express'
import { authenticationMiddleware } from '../auth/token.js'
import { IOServer } from '../websocket/index.js'
import chatRouter from './chat/index.js'
import userRouter from './user/index.js'
import uploadRouter from './upload/index.js'
import { initializeTasks } from './tasks.js'

export default function mfRouter(socketServer: IOServer) {
  const router = Router({ mergeParams: true })

  router.use('/chat', chatRouter(socketServer))
  router.use('/user', userRouter)
  router.use('/upload', uploadRouter)

  // 初始化后台任务
  initializeTasks()

  return router
}
