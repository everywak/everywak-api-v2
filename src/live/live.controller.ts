import { Controller, Get, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LiveService } from './live.service';

@Controller('live')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}
  private readonly logger = new Logger(LiveController.name);

  @Get()
  getLiveAll() {
    return this.liveService.findLiveAll();
  }

  @Get('/events')
  getLiveChangeAll() {
    return this.liveService.findLiveChangeAll();
  }

  @Get('/member/:memberId')
  getLiveByMemberId(memberId: string) {
    return this.liveService.findLiveByMemberId(memberId);
  }

  @Get('/update')
  updateWaktaverseLive() {
    return this.liveService.updateWaktaverseLive();
  }

  @Cron('0,15,30,45 * * * * *', {
    name: 'update-lives',
    timeZone: 'Asia/Seoul',
  })
  automatelyUpdate() {
    try {
      return this.liveService.updateWaktaverseLive();
    } catch (e) {
      this.logger.error(e);
      console.error(e);
    }
  }
}
