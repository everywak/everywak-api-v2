import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from 'src/config/database.config';
import { TypeOrmConfigService } from 'src/config/typeorm.config';
import youtubeConfig from 'src/config/youtube.config';
import { Member } from 'src/member/entities/member.entity';
import { MemberModule } from 'src/member/member.module';
import { NavercafeModule } from 'src/navercafe/navercafe.module';
import { DataSource } from 'typeorm';
import { OBI } from './entities/obi.entity';
import { ObiController } from './obi.controller';
import { ObiService } from './obi.service';

describe('ObiController', () => {
  let controller: ObiController;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [databaseConfig, youtubeConfig],
          envFilePath: '.env.test.local',
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useClass: TypeOrmConfigService,
        }),
        TypeOrmModule.forFeature([Member, OBI]),
        NavercafeModule,
        MemberModule,
      ],
      controllers: [ObiController],
      providers: [ObiService],
    }).compile();

    controller = module.get<ObiController>(ObiController);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });
});
