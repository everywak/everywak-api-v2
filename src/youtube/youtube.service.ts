import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, map } from 'rxjs';
import { RequestYoutubeDto } from './dto/request-youtube.dto';
import { SelectChannelDto } from './dto/select-channel.dto';
import { SelectPlaylistDto } from './dto/select-playlist.dto';
import {
  ChannelListResponse,
  PlaylistItemListResponse,
} from './youtube.type';

@Injectable()
export class YoutubeService {
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  @Inject(HttpService)
  private readonly httpService: HttpService;

  private readonly hostname = 'https://www.googleapis.com/youtube/v3';

  async request<T>(dto: RequestYoutubeDto): Promise<T> {
    return await lastValueFrom(
      this.httpService
        .get(dto.url, { params: dto.params })
        .pipe(map((response) => response.data)),
    );
  }

  async getChannels(selectChannelDto: SelectChannelDto) {
    const { channelId, part } = selectChannelDto;
    const url = this.hostname + `/channels`;
    const params = {
      part: part.join(','),
      id: channelId.join(','),
      key: this.configService.get('youtube.apiKey'),
    };
    return await this.request<ChannelListResponse>({ url, params });
  }

  async getPlaylistItems(selectPlaylistDto: SelectPlaylistDto) {
    const { playlistId, part } = selectPlaylistDto;
    const url = this.hostname + `/playlistItems`;
    const params = {
      part: part.join(','),
      playlistId,
      key: this.configService.get('youtube.apiKey'),
    };
    return await this.request<PlaylistItemListResponse>({ url, params });
  }
}