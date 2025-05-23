import { Heading } from '@digdir/designsystemet-react';
import { Link } from 'react-router';
import classes from './teaser-card.module.css';

interface TeaserCardProps {
  title: string;
  description?: string;
  author?: string;
  date?: string;
  href: string;
}

const TeaserCard = ({
  title,
  description,
  href,
  author,
  date,
}: TeaserCardProps) => {
  return (
    <Link className={classes.card} to={href}>
      <Heading level={3} data-size='sm' className={classes.title}>
        {title}
      </Heading>
      <p className={classes.desc}>{description}</p>
      {author && date && (
        <div className={classes.meta}>
          <span>{author}</span>
          <span>{date}</span>
        </div>
      )}
    </Link>
  );
};

export { TeaserCard };
