import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './config/typeorm.config';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { BestwakkiModule } from './bestwakki/bestwakki.module';
import { NavercafeModule } from './navercafe/navercafe.module';
import { MemberModule } from './member/member.module';
import { LiveModule } from './live/live.module';
import { YoutubeModule } from './youtube/youtube.module';
import { AfreecaModule } from './afreeca/afreeca.module';
import { FetchModule } from './fetch/fetch.module';
import { ObiModule } from './obi/obi.module';
import { VideoModule } from './video/video.module';
import { WaktoonModule } from './waktoon/waktoon.module';
import { MusicModule } from './music/music.module';
import { NoticeModule } from './notice/notice.module';
import databaseConfig from './config/database.config';
import youtubeConfig from './config/youtube.config';
import { LoggerMiddleware } from './util/logger/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig, youtubeConfig],
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? '.env.test.local'
          : ['.env.development.local', '.env.production.local'],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: TypeOrmConfigService,
    }),
    ScheduleModule.forRoot(),
    BestwakkiModule,
    NavercafeModule,
    MemberModule,
    LiveModule,
    YoutubeModule,
    AfreecaModule,
    FetchModule,
    ObiModule,
    VideoModule,
    WaktoonModule,
    MusicModule,
    NoticeModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
