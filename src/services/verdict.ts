export interface Verdict {
  emoji: string;
  title: string;
  message: string;
  comparison: string;
}

const verdicts: { maxUsd: number; verdict: Verdict }[] = [
  {
    maxUsd: 1,
    verdict: {
      emoji: '🌱',
      title: 'Grass Toucher',
      message: 'You\'ve barely burned any gas. Are you even using crypto?',
      comparison: 'a single cup of coffee'
    }
  },
  {
    maxUsd: 10,
    verdict: {
      emoji: '🐣',
      title: 'Baby Degen',
      message: 'Just getting started. The chain barely knows you exist.',
      comparison: 'a fancy avocado toast'
    }
  },
  {
    maxUsd: 50,
    verdict: {
      emoji: '🔥',
      title: 'Casual Burner',
      message: 'You\'ve made some moves. Not a whale, but not invisible either.',
      comparison: 'a nice dinner for one'
    }
  },
  {
    maxUsd: 100,
    verdict: {
      emoji: '💸',
      title: 'Gas Guzzler',
      message: 'Starting to add up! That\'s real money evaporating into the void.',
      comparison: 'a pair of decent sneakers'
    }
  },
  {
    maxUsd: 500,
    verdict: {
      emoji: '🚗',
      title: 'Road Trip Burner',
      message: 'You could have driven across the country with that gas money.',
      comparison: 'a weekend getaway'
    }
  },
  {
    maxUsd: 1000,
    verdict: {
      emoji: '✈️',
      title: 'Frequent Flyer',
      message: 'Hope those transactions were worth it. That\'s a plane ticket.',
      comparison: 'a round-trip flight to Europe'
    }
  },
  {
    maxUsd: 5000,
    verdict: {
      emoji: '🏍️',
      title: 'Used Car Money',
      message: 'You\'ve burned enough gas to buy a used car. Literally.',
      comparison: 'a decent used motorcycle'
    }
  },
  {
    maxUsd: 10000,
    verdict: {
      emoji: '🚙',
      title: 'Car Payment Champion',
      message: 'That\'s a down payment on a new car. Gone. Poof.',
      comparison: 'a used Honda Civic'
    }
  },
  {
    maxUsd: 50000,
    verdict: {
      emoji: '🏠',
      title: 'Down Payment Destroyer',
      message: 'You could have put this toward a house. Instead, miners thank you.',
      comparison: 'a house down payment in some states'
    }
  },
  {
    maxUsd: 100000,
    verdict: {
      emoji: '🛥️',
      title: 'Yacht Gas Money',
      message: 'Touching grass would have been significantly cheaper.',
      comparison: 'a small boat or a really nice car'
    }
  },
  {
    maxUsd: 500000,
    verdict: {
      emoji: '🏰',
      title: 'Castle Builder',
      message: 'You\'ve funded validator retirements. Congrats, I guess?',
      comparison: 'a house in most cities'
    }
  },
  {
    maxUsd: Infinity,
    verdict: {
      emoji: '👑',
      title: 'Gas Royalty',
      message: 'You are personally responsible for keeping Ethereum validators employed.',
      comparison: 'generational wealth, burned'
    }
  }
];

export function generateVerdict(totalUsd: number, totalTransactions: number): Verdict {
  const baseVerdict = verdicts.find(v => totalUsd <= v.maxUsd)?.verdict || verdicts[verdicts.length - 1].verdict;
  
  // Add transaction context
  const txSuffix = totalTransactions > 500 
    ? ' You\'re clearly addicted.'
    : totalTransactions > 100
    ? ' That\'s a lot of clicking.'
    : totalTransactions > 10
    ? ''
    : ' Still warming up.';
  
  return {
    ...baseVerdict,
    message: baseVerdict.message + txSuffix
  };
}

export function formatVerdict(verdict: Verdict, totalUsd: number): string {
  return `${verdict.emoji} ${verdict.title}\n\n"${verdict.message}"\n\nYou spent $${totalUsd.toLocaleString()} on gas — that's roughly ${verdict.comparison}.`;
}
