import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MemberService } from 'src/member/member.service';
import { SelectArticleListDto } from 'src/navercafe/dto/select-article-list.dto';
import { NavercafeService } from 'src/navercafe/navercafe.service';
import { Repository } from 'typeorm';
import { SearchMemberNoticeDto } from './dto/search-member-notice.dto';
import { MemberNotice } from './entities/member-notice.entity';

@Injectable()
export class NoticeService {
  @InjectRepository(MemberNotice)
  private memberNoticeRepository: Repository<MemberNotice>;
  @Inject(NavercafeService)
  private navercafeService: NavercafeService;
  @Inject(MemberService)
  private memberService: MemberService;

  findAll() {
    return this.memberNoticeRepository.find();
  }

  find(dto: SearchMemberNoticeDto) {
    return this.memberNoticeRepository.find({
      where: {
        member: {
          id: dto.memberId,
        },
      },
      order: { publishedTimestamp: 'DESC' },
      take: dto.perPage,
      skip: dto.perPage * (dto.page - 1),
      relations: ['member'],
    });
  }

  async update() {
    const noticeArticles = await this.navercafeService.getArticleList(
      new SelectArticleListDto({ menuId: 1 }),
    );
    const members = await this.memberService.findAll();

    const filteredArticles = noticeArticles.articleList.filter((notice) =>
      members.find(
        (member) =>
          member.social.find((social) => social.type === 'navercafe')?.id ===
          notice.memberKey,
      ),
    );

    const notices = filteredArticles.map(
      (article) =>
        new MemberNotice({
          articleId: article.articleId,
          publishedTimestamp: new Date(article.writeDateTimestamp),
          subject: article.subject,
          member: members.find(
            (member) =>
              member.social.find((social) => social.type === 'navercafe')
                ?.id === article.memberKey,
          ),
          menuId: article.menuId,
          menuName: article.menuName,
          readCount: article.readCount,
          commentCount: article.commentCount,
          upCount: article.likeItCount,
        }),
    );

    return await this.memberNoticeRepository.upsert(notices, ['articleId']);
  }
}