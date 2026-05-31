/**
 * Central icon registry — import ALL icons from here, never directly from 'lucide-react'.
 *
 * Semantic names keep component code readable and make library swaps trivial:
 * change one line here, every consumer updates automatically.
 *
 * Sizing convention (use Tailwind classes on the icon component):
 *   xs  → w-3 h-3        (badge indicators)
 *   sm  → w-3.5 h-3.5    (inline text actions)
 *   md  → w-4 h-4        (default — buttons, nav)
 *   lg  → w-5 h-5        (prominent actions, headers)
 *   xl  → w-6 h-6        (feature icons)
 *   2xl → w-8 h-8        (empty states, hero)
 *
 * strokeWidth convention:
 *   inactive nav / subtle → 1.75
 *   default                → 2
 *   active / emphasis      → 2.5
 */

// ── Actions ───────────────────────────────────────────────────────────────────
export { Plus        as IconAdd         } from 'lucide-react'
export { Pencil      as IconEdit        } from 'lucide-react'
export { Trash2      as IconDelete      } from 'lucide-react'
export { X           as IconClose       } from 'lucide-react'
export { Check       as IconCheck       } from 'lucide-react'
export { Copy        as IconCopy        } from 'lucide-react'
export { Save        as IconSave        } from 'lucide-react'
export { Search      as IconSearch      } from 'lucide-react'
export { Filter      as IconFilter      } from 'lucide-react'
export { SortAsc     as IconSortAsc     } from 'lucide-react'
export { SortDesc    as IconSortDesc    } from 'lucide-react'
export { RefreshCw   as IconRefresh     } from 'lucide-react'
export { RotateCcw   as IconUndo        } from 'lucide-react'

// ── Navigation ────────────────────────────────────────────────────────────────
export { ChevronLeft    as IconChevronLeft    } from 'lucide-react'
export { ChevronRight   as IconChevronRight   } from 'lucide-react'
export { ChevronUp      as IconChevronUp      } from 'lucide-react'
export { ChevronDown    as IconChevronDown    } from 'lucide-react'
export { ArrowLeft      as IconBack           } from 'lucide-react'
export { ArrowRight     as IconForward        } from 'lucide-react'
export { ArrowUpDown    as IconSort           } from 'lucide-react'
export { ExternalLink   as IconExternalLink   } from 'lucide-react'

// ── Data / Files ──────────────────────────────────────────────────────────────
export { Upload          as IconUpload         } from 'lucide-react'
export { Download        as IconDownload       } from 'lucide-react'
export { FileText        as IconFilePdf        } from 'lucide-react'
export { FileSpreadsheet as IconFileCsv        } from 'lucide-react'
export { FolderOpen      as IconFolder         } from 'lucide-react'

// ── Finance ───────────────────────────────────────────────────────────────────
export { TrendingUp    as IconIncome       } from 'lucide-react'
export { TrendingDown  as IconExpense      } from 'lucide-react'
export { Wallet        as IconWallet       } from 'lucide-react'
export { PiggyBank     as IconSavings      } from 'lucide-react'
export { BarChart3     as IconChart        } from 'lucide-react'
export { CalendarCheck as IconCalCheck     } from 'lucide-react'
export { CreditCard    as IconCard         } from 'lucide-react'
export { DollarSign    as IconMoney        } from 'lucide-react'

// ── UI / Layout ───────────────────────────────────────────────────────────────
export { LayoutDashboard as IconDashboard   } from 'lucide-react'
export { AlignJustify    as IconList        } from 'lucide-react'
export { Menu            as IconMenu        } from 'lucide-react'
export { MoreHorizontal  as IconMore        } from 'lucide-react'
export { MoreVertical    as IconMoreV       } from 'lucide-react'
export { Settings2       as IconSettings    } from 'lucide-react'
export { Bell            as IconBell        } from 'lucide-react'
export { Moon            as IconMoon        } from 'lucide-react'
export { Sun             as IconSun         } from 'lucide-react'
export { HelpCircle      as IconHelp        } from 'lucide-react'
export { Info            as IconInfo        } from 'lucide-react'
export { AlertCircle     as IconWarning     } from 'lucide-react'
export { AlertTriangle   as IconAlert       } from 'lucide-react'

// ── Auth / User ───────────────────────────────────────────────────────────────
export { LogOut    as IconSignOut   } from 'lucide-react'
export { User      as IconUser      } from 'lucide-react'
export { Smartphone as IconMobile   } from 'lucide-react'

// ── Sport ─────────────────────────────────────────────────────────────────────
export { Trophy        as IconTrophy       } from 'lucide-react'
export { Flag          as IconFlag         } from 'lucide-react'
export { Dumbbell      as IconWorkout      } from 'lucide-react'
export { Target        as IconTarget       } from 'lucide-react'
export { Scale         as IconScale        } from 'lucide-react'
export { GraduationCap as IconGraduation   } from 'lucide-react'
export { ArrowLeftRight as IconTransfer    } from 'lucide-react'

// ── Content ───────────────────────────────────────────────────────────────────
export { BookOpen    as IconBook        } from 'lucide-react'
export { StickyNote  as IconNote        } from 'lucide-react'
export { Tag         as IconTag         } from 'lucide-react'
export { Link        as IconLink        } from 'lucide-react'
export { Link2Off    as IconUnlink      } from 'lucide-react'
export { Volume2     as IconSpeaker     } from 'lucide-react'
export { Languages   as IconLanguage    } from 'lucide-react'
export { Globe       as IconGlobe       } from 'lucide-react'

// ── Misc ──────────────────────────────────────────────────────────────────────
export { Calendar    as IconCalendar    } from 'lucide-react'
export { Clock       as IconClock       } from 'lucide-react'
export { MapPin      as IconLocation    } from 'lucide-react'
export { Star        as IconStar        } from 'lucide-react'
export { Heart       as IconHeart       } from 'lucide-react'
export { Newspaper   as IconNews        } from 'lucide-react'
