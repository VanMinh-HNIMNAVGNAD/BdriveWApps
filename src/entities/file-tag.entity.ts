import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FileItem } from './file-item.entity';
import { Tag } from './tag.entity';

@Entity('file_tags')
export class FileTag {
  @PrimaryColumn({ name: 'file_id' })
  fileId: string;

  @PrimaryColumn({ name: 'tag_id' })
  tagId: string;

  @ManyToOne(() => FileItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: FileItem;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
