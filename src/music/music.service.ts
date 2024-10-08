import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MemberService } from 'src/member/member.service';
import { generateDateHourString } from 'src/util/functions';
import { VideoViewCount } from 'src/video/entities/video-view-count.entity';
import { VideoService } from 'src/video/video.service';
import { SelectPlaylistDto } from 'src/youtube/dto/select-playlist.dto';
import { YoutubeService } from 'src/youtube/youtube.service';
import { FindOptionsOrder, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CreateMusicDto } from './dto/create-music.dto';
import { DeleteMusicDto } from './dto/delete-music.dto';
import { Duration, SearchMusicChartDto } from './dto/search-music-chart.dto';
import {
  SearchMusicDto,
  OrderBy as MusicOrderBy,
  SearchTarget,
} from './dto/search-music.dto';
import { UpdateMusicDto } from './dto/update-music.dto';
import { MusicChart } from './entities/music-chart.entity';
import { Music } from './entities/music.entity';

@Injectable()
export class MusicService {
  @InjectRepository(Music)
  private musicRepository: Repository<Music>;

  @InjectRepository(MusicChart)
  private musicChartRepository: Repository<MusicChart>;

  @Inject(MemberService)
  private memberService: MemberService;

  @Inject(VideoService)
  private videoService: VideoService;

  @Inject(YoutubeService)
  private youtubeService: YoutubeService;

  private readonly logger = new Logger(MusicService.name);

  findAll() {
    this.logger.verbose(`모든 뮤직 목록 조회`);
    return this.musicRepository.find({
      relations: ['video', 'singers'],
    });
  }

  findById(id: string) {
    this.logger.verbose(`뮤직 조회: ${id}`);
    return this.musicRepository.findOne({
      where: { id },
    });
  }

  async find(dto: SearchMusicDto) {
    this.logger.log(`뮤직 목록 조회: ${JSON.stringify(dto)}`);
    const searchTarget: Record<
      SearchTarget,
      FindOptionsWhere<Music> | FindOptionsWhere<Music>[]
    > = {
      title: { title: ILike(`%${dto.keyword}%`) },
      singer: [
        { singerName: ILike(`%${dto.keyword}%`) },
        { singers: { name: ILike(`%${dto.keyword}%`) } },
        { singers: { id: ILike(dto.keyword) } },
      ],
    };

    const orderBy: Record<MusicOrderBy, FindOptionsOrder<Music>> = {
      time: { video: { publishedTimestamp: 'DESC' } },
      time_oldest: { video: { publishedTimestamp: 'ASC' } },
      view: { video: { viewCount: 'DESC' } },
    };

    return this.musicRepository.find({
      select: ['id', 'video', 'title', 'singerName', 'singers'],
      where: searchTarget[dto.searchTarget],
      order: orderBy[dto.orderBy],
      take: dto.perPage,
      skip: (dto.page - 1) * dto.perPage,
      relations: ['video', 'singers'],
    });
  }

  async findChart(dto: SearchMusicChartDto) {
    this.logger.log(`뮤직 차트 목록 조회: ${JSON.stringify(dto)}`);
    const chart = await this.musicChartRepository.find({
      where: {
        duration: dto.duration,
      },
      order: { increasedViewCount: 'DESC' },
      take: dto.perPage,
      skip: (dto.page - 1) * dto.perPage,
      relations: ['music', 'music.video'],
    });
    return chart;
  }

  async create(dto: CreateMusicDto) {
    this.logger.log(`뮤직 생성: ${JSON.stringify(dto)}`);
    const members = await this.memberService.findAll();

    const video = await this.videoService.getVideo(dto.videoId);
    if (!video) {
      throw new BadRequestException('Video not found');
    }

    const singers = dto.singers.map((id) => members.find((m) => m.id === id));
    return await this.musicRepository.save(
      new Music({ ...dto, video, singers }),
    );
  }

  async edit(dto: UpdateMusicDto) {
    this.logger.log(`뮤직 수정: ${JSON.stringify(dto)}`);
    const target = this.findById(dto.id);

    if (!target) {
      throw new NotFoundException('Not found');
    }

    const { singers, ...rest } = dto;

    const updatedMusic = new Music({ ...target, ...rest });
    if (singers) {
      const members = await this.memberService.findAll();
      updatedMusic.singers = dto.singers.map((id) =>
        members.find((m) => m.id === id),
      );
    }

    return await this.musicRepository.update(dto.id, updatedMusic);
  }

  delete(dto: DeleteMusicDto) {
    this.logger.log(`뮤직 제거: ${JSON.stringify(dto)}`);
    return this.musicRepository.delete(dto.id);
  }

  getDateFromDuration(duration: Duration, now: Date): [Date, Date] {
    const before = new Date(now);
    const after = new Date(now);
    switch (duration) {
      case 'hourly':
        before.setHours(before.getHours() - 1);
        break;
      case '24hours':
        before.setHours(before.getHours() - 24);
        break;
      case 'daily':
        before.setDate(before.getDate() - 1);
        before.setHours(0);
        after.setHours(0);
        break;
      case 'weekly':
        after.setDate(after.getDate() - after.getDay());
        before.setDate(after.getDate() - 7);
        break;
      case 'monthly':
        before.setMonth(before.getMonth() - 1);
        before.setDate(1);
        after.setDate(1);
        break;
    }
    return [before, after];
  }

  async generateMusicChart(
    musics: Music[],
    popularity: VideoViewCount[],
    duration: Duration,
    now: Date,
  ) {
    const [dateFrom, dateTo] = this.getDateFromDuration(duration, now);
    const before = generateDateHourString(dateFrom);
    const after = generateDateHourString(dateTo);

    const beforeViewCounts: Record<string, VideoViewCount> = {};
    const afterViewCounts: Record<string, VideoViewCount> = {};

    popularity.forEach((p) => {
      if (
        p.time <= before &&
        (!beforeViewCounts[p.video.videoId] ||
          beforeViewCounts[p.video.videoId].time < p.time)
      ) {
        beforeViewCounts[p.video.videoId] = p;
      }
      if (
        p.time <= after &&
        (!afterViewCounts[p.video.videoId] ||
          afterViewCounts[p.video.videoId].time < p.time)
      ) {
        afterViewCounts[p.video.videoId] = p;
      }
    });

    const chart: MusicChart[] = [];

    Object.entries(afterViewCounts).forEach(([id, afterViewCount]) => {
      const beforeViewCount = beforeViewCounts[id];
      const music = musics.find((m) => m.video.videoId === id);
      if (!beforeViewCount || !music) {
        return;
      }
      const chartItem = new MusicChart({
        id: `${duration}:${afterViewCount.video.videoId}`,
        music,
        duration,
        increasedViewCount:
          afterViewCount.viewCount - beforeViewCount.viewCount,
      });
      chart.push(chartItem);
    });

    return chart;
  }

  async updateMusicChart() {
    this.logger.log(`뮤직 차트 목록 갱신 시작`);
    const musics = await this.findAll();
    const popularity = await this.videoService.findViewCount({
      endAt: generateDateHourString(now),
    });

    const hourlyChart = await this.generateMusicChart(
      musics,
      popularity,
      'hourly',
      now,
    );
    const _24hoursChart = await this.generateMusicChart(
      musics,
      popularity,
      '24hours',
      now,
    );
    const dailyChart = await this.generateMusicChart(
      musics,
      popularity,
      'daily',
      now,
    );
    const weeklyChart = await this.generateMusicChart(
      musics,
      popularity,
      'weekly',
      now,
    );
    const monthlyChart = await this.generateMusicChart(
      musics,
      popularity,
      'monthly',
      now,
    );

    const chartItems = [
      ...hourlyChart,
      ..._24hoursChart,
      ...dailyChart,
      ...weeklyChart,
      ...monthlyChart,
    ];

    await this.musicChartRepository.manager.transaction(async (manager) => {
      while (chartItems.length > 0) {
        const chunk = chartItems.splice(0, 500);
        await manager.upsert(MusicChart, chunk, ['id']);
      }
    });

    this.logger.log(`뮤직 차트 갱신 완료`);
    return {
      hourly: hourlyChart.length,
      _24hours: _24hoursChart.length,
      daily: dailyChart.length,
      weekly: weeklyChart.length,
      monthly: monthlyChart.length,
    };
  }

  async createMusicFromWakAllMusic() {
    this.logger.log(`뮤직 올뮤직 자동 추가 시작`);
    const targetVideos = await this.getVideosCreateNeeded();

    const members = await this.memberService.findAll();

    const result: Music[] = [];
    for (const video of targetVideos) {
      const singers = members
        .filter((member) => video.title.includes(member.name))
        .map((member) => member.id);
      result.push(
        await this.create(
          new CreateMusicDto({
            videoId: video.videoId,
            title: video.title,
            singerName: video.member.name,
            singers,
          }),
        ),
      );
    }

    if (targetVideos.length > 0) {
      this.logger.log(`뮤직 올뮤직 자동 추가: ${targetVideos.length}개`);
    }
    return result;
  }

  async getVideosCreateNeeded() {
    const playlistItems = await this.youtubeService.getPlaylistItems(
      new SelectPlaylistDto({
        playlistId: 'PLWTycz4el4t7ZCxkGYyekoP1iBxmOM4zZ',
      }),
    );

    const musics = await this.findAll();
    const videos = await this.videoService.findAll();

    const result = videos.filter((video) => {
      return (
        !musics.find((music) => music.video.videoId === video.videoId) &&
        playlistItems.find(
          (item) => item.snippet.resourceId.videoId === video.videoId,
        )
      );
    });

    return result;
  }
}
