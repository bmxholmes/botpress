import * as sdk from 'botpress/sdk'
import { AnalyticsRepository } from 'core/repositories/analytics-repository'
import { Migration, MigrationOpts } from 'core/services/migration'
import { TYPES } from 'core/types'
import _ from 'lodash'

const migration: Migration = {
  info: {
    description: 'Migration for the nex analytics',
    target: 'core',
    type: 'database'
  },
  up: async ({ bp, inversify }: MigrationOpts): Promise<sdk.MigrationResult> => {
    try {
      await bp.database.schema.table('srv_channel_users', table => {
        table.string('botId')
      })

      // Can only populate botId from users created on channel web
      const users = await bp
        .database('srv_channel_users')
        .select('user_id', 'channel')
        .where({ channel: 'web' })

      const usersBots = await bp
        .database('web_conversations')
        .select(['botId', 'userId'])
        .whereIn(
          'userId',
          users.map(x => x.user_id)
        )
        .distinct()

      usersBots.forEach(async userBot => {
        await bp
          .database('srv_channel_users')
          .update({ botId: userBot['botId'] })
          .where({ user_id: userBot['userId'] })
      })

      const updated_users = await bp
        .database('srv_channel_users')
        .select('user_id', 'channel', 'botId')
        .where({ channel: 'web' })

      const analyticsRepo = inversify.get<AnalyticsRepository>(TYPES.AnalyticsRepository)
      await Promise.mapSeries(updated_users, user =>
        analyticsRepo.insertOrUpdate({
          botId: user['botId'],
          channel: user['channel'],
          metric: sdk.AnalyticsMetric.UsersTotal,
          method: sdk.AnalyticsMethod.TotalCount
        })
      )

      return { success: true, message: 'Configuration updated successfully' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }
}

export default migration