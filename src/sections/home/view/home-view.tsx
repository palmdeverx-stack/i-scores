'use client';

import { useState } from 'react';
import Fade from 'embla-carousel-fade';
import ReactPlayer from 'react-player';
import Autoplay from 'embla-carousel-autoplay';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { CONFIG } from 'src/global-config';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';
import { Carousel, useCarousel } from 'src/components/carousel';

// ----------------------------------------------------------------------

const HERO_IMAGE = [
  '/assets/background/akhahas-sri-1.jpg',
  '/assets/background/akhahas-sri-2.jpg',
  '/assets/background/akhahas-sri-3.jpg',
  '/assets/background/akhahas-sri-4.jpg',
  '/assets/background/akhahas-sri-5.jpg',
  '/assets/background/akhahas-sri-6.jpg',
  '/assets/background/akhahas-sri-7.jpg',
].slice(0, 7);
const SCENES_IMAGE = '/assets/akhahas-sri/hero-2.jpg';
const MEMORIAL_IMAGE = '/assets/akhahas-sri/rip-1.jpeg';
const KRU_IMAGE = '/assets/akhahas-sri/bg-1.jpg';

const SCENES_1_IMAGE = '/assets/akhahas-sri/hero-5.jpeg';

const highlights = [
  {
    icon: '99',
    title: 'ผลงานการแสดง',
    body: 'การแสดงดนตรีพื้นบ้านอีสานและกิจกรรมทางวัฒนธรรมในหลากหลายเวที',
  },
  {
    icon: '99',
    title: 'สมาชิกวง',
    body: 'นักดนตรี นักแสดง และทีมสร้างสรรค์ที่ร่วมสืบสานศิลปวัฒนธรรมอีสาน',
  },
  {
    icon: '99',
    title: 'รางวัลและเวทีประกวด',
    body: 'ประสบการณ์จากการแสดงและการแข่งขันดนตรีพื้นบ้านระดับภูมิภาคและระดับประเทศ',
  },
];

const ROYAL_IMAGE_ITEMS = [
  {
    title: 'สมเด็จพระกนิษฐาธิราชเจ้า ฯ เชิญขวัญแม่โคสกเจ้า เข้าคืนนา',
    src: '/assets/akhahas-sri/ac-1.png',
  },
  {
    title: 'สมเด็จพระกนิษฐาธิราชเจ้า ฯ เชิญขวัญแม่โคสกเจ้า เข้าคืนนา',
    src: '/assets/akhahas-sri/ac-2.png',
  },
  {
    title: 'สมเด็จพระกนิษฐาธิราชเจ้า ฯ เชิญขวัญแม่โคสกเจ้า เข้าคืนนา',
    src: '/assets/akhahas-sri/ac-3.png',
  },
  {
    title: 'สมเด็จพระกนิษฐาธิราชเจ้า ฯ เชิญขวัญแม่โคสกเจ้า เข้าคืนนา',
    src: '/assets/akhahas-sri/ac-4.png',
  },
];

const VIDEO_ITEMS = [
  {
    title: 'เทิดพระเกียรติ | วงโปงลางอรรคฮาตสี การประกวดวงโปงลางกรมพลศึกษา 65',
    src: 'https://www.youtube.com/watch?v=hZB0LIYLSgM&list=RDhZB0LIYLSgM&start_radio=1',
    cover: 'https://img.youtube.com/vi/hZB0LIYLSgM/maxresdefault.jpg',
  },
  {
    title: 'วงโปงลางอรรคฮาตสี | การประกวดวงโปงลางกรมพลศึกษา 66',
    src: 'https://www.youtube.com/watch?v=S1twzNXRbCY&list=RDS1twzNXRbCY&start_radio=1&t=1076s',
    cover: 'https://img.youtube.com/vi/S1twzNXRbCY/maxresdefault.jpg',
  },
  {
    title: 'เทิดพระเกียรติ - วงโปงลางอรรคฮาตสี | การประกวดวงโปงลางกรมพลศึกษา 67',
    src: 'https://www.youtube.com/watch?v=gxiq1n3JOT8&list=RDgxiq1n3JOT8&start_radio=1',
    cover: 'https://img.youtube.com/vi/gxiq1n3JOT8/maxresdefault.jpg',
  },
  {
    title: 'อรรคฮาตสีลาแฟน | วงโปงลางอรรคฮาตสี [Official MV]',
    src: 'https://www.youtube.com/watch?v=Zr1H0ultIQ8',
    cover: 'https://img.youtube.com/vi/Zr1H0ultIQ8/maxresdefault.jpg',
  },
];

function PlayButton({ small = false }: { small?: boolean }) {
  const theme = useTheme();
  return (
    <Box
      component="span"
      sx={{
        width: small ? 34 : 48,
        height: small ? 34 : 48,
        display: 'grid',
        borderRadius: '50%',
        color: theme.palette.secondary.main,
        placeItems: 'center',
        border: '2px solid rgba(234,215,161,0.88)',
        backgroundColor: 'rgba(9, 47, 33, 0.42)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.34), 0 0 20px rgba(217,181,109,0.14)',
        '&::before': {
          content: '""',
          width: 0,
          height: 0,
          ml: '3px',
          borderTop: `${small ? 6 : 8}px solid transparent`,
          borderBottom: `${small ? 6 : 8}px solid transparent`,
          borderLeft: `${small ? 9 : 13}px solid currentColor`,
        },
      }}
    />
  );
}

export function HomeView() {
  const theme = useTheme();
  const [videoPreviewKey, setVideoPreviewKey] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<(typeof VIDEO_ITEMS)[number] | null>(null);
  const [selectedImage, setSelectedImage] = useState<(typeof ROYAL_IMAGE_ITEMS)[number] | null>(
    null
  );
  const heroCarousel = useCarousel({ loop: true, duration: 80 }, [
    Fade(),
    Autoplay({ playOnInit: true, delay: 5000 }),
  ]);

  const handleCloseVideo = () => {
    setSelectedVideo(null);
    setVideoPreviewKey((prev) => prev + 1);
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        color: theme.palette.secondary.main,
        overflow: 'hidden',
        bgcolor: theme.palette.primary.main,
        fontFamily: "'LINE Seed Sans TH', sans-serif",
      }}
    >
      <Box
        sx={{
          minHeight: { xs: 760, md: 1020 },
          position: 'relative',
          px: { xs: 2.5, md: 8, lg: 13 },
          pt: { xs: 14, md: 19 },
          pb: { xs: 7, md: 6 },
          bgcolor: '#052518',
        }}
      >
        <Carousel
          carousel={heroCarousel}
          sx={{
            m: 0,
            inset: 0,
            width: 1,
            height: 1,
            zIndex: 0,
            position: 'absolute',
          }}
          slotProps={{
            container: { height: 1 },
            slide: { height: 1 },
          }}
        >
          {HERO_IMAGE.map((src, index) => (
            <Image
              key={src}
              alt={`Akhahas'sri hero ${index + 1}`}
              src={src}
              visibleByDefault
              disablePlaceholder
              sx={{ width: 1, height: 1 }}
            />
          ))}
        </Carousel>

        <Box
          sx={{
            inset: 0,
            zIndex: 1,
            position: 'absolute',
            pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(180deg, rgba(9,47,33,0.18) 0%, rgba(9,47,33,0.58) 56%, ${theme.palette.secondary.main} 100%),
              linear-gradient(90deg, rgba(5,37,24,0.94) 0%, rgba(18,61,43,0.58) 48%, rgba(5,37,24,0.84) 100%),
              linear-gradient(0deg, rgba(217,181,109,0.08), rgba(217,181,109,0.08))
            `,
          }}
        />

        <Box sx={{ mx: 'auto', maxWidth: 1280, position: 'relative', zIndex: 2 }}>
          <Box sx={{ maxWidth: 610 }}>
            <Image
              alt="Single logo"
              sx={{ width: 200 }}
              src={`${CONFIG.assetsDir}/logo/logo-single.svg`}
            />
            <Typography
              sx={{
                mt: 2,
                color: theme.palette.secondary.main,
                fontSize: { xs: 47, sm: 68, md: 82 },
                fontWeight: 800,
                lineHeight: 0.92,
                textTransform: 'uppercase',
              }}
            >
              AKHAHAS&apos;SRI
            </Typography>
            <Typography variant="h1">อรรคฮาตสี</Typography>

            <Typography variant="h5">บ้านขามเรียง มหาสารคาม</Typography>
          </Box>

          <Stack
            spacing={1.35}
            sx={{
              top: { xs: 152, md: 170 },
              right: 0,
              width: 120,
              display: { xs: 'none', md: 'flex' },
              position: 'absolute',
              alignItems: 'flex-end',
            }}
          >
            {HERO_IMAGE.map((_, index) => (
              <Stack
                key={index}
                direction="row"
                spacing={1.3}
                alignItems="center"
                sx={{
                  color:
                    index === heroCarousel.dots.selectedIndex
                      ? theme.palette.secondary.main
                      : 'rgba(246,237,219,0.48)',
                  cursor: 'pointer',
                }}
                onClick={() => heroCarousel.dots.onClickDot(index)}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
                  {String(index + 1).padStart(2, '0')}
                </Typography>
                <Box
                  sx={{
                    height: 2,
                    width: index === heroCarousel.dots.selectedIndex ? 78 : 18,
                    bgcolor:
                      index === heroCarousel.dots.selectedIndex
                        ? theme.palette.secondary.main
                        : 'rgba(234,215,161,0.28)',
                  }}
                />
              </Stack>
            ))}
          </Stack>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 3, md: 5 }}
            sx={{
              mt: { xs: 19, md: 23 },
              pt: 3,
              borderBottom: '1px solid rgba(234,215,161,0.26)',
              pb: 4,
            }}
          >
            {highlights.map((item) => (
              <Stack key={item.title} direction="row" spacing={2.2} sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    color: theme.palette.secondary.main,
                    fontSize: 24,
                    fontWeight: 800,
                    opacity: 0.78,
                    minWidth: 34,
                    lineHeight: 1,
                  }}
                >
                  {item.icon}
                </Typography>
                <Box>
                  <Typography variant="h6">{item.title}</Typography>
                  <Typography variant="body1" sx={{ mt: 0.8, color: 'rgba(246,237,219,0.58)' }}>
                    {item.body}
                  </Typography>
                  {/* <Typography
                    variant="subtitle1"
                    sx={{
                      mt: 1.5,
                      color: theme.palette.secondary.main,
                      textTransform: 'uppercase',
                    }}
                  >
                    รากหดกหด
                  </Typography> */}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2.5, md: 8, lg: 13 },
          py: { xs: 7, md: 11 },
          // color: theme.palette.secondary.main,
          backgroundImage: `
            radial-gradient(circle at 50% 8%,  ${theme.palette.secondary.main} 0,  ${theme.palette.secondary.main} 10%),
            linear-gradient(180deg, ${theme.palette.secondary.main} 0, #034420 92px, #012d1a 100%)
          `,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            component="img"
            src={MEMORIAL_IMAGE}
            alt="Lotus memorial collage"
            sx={{
              width: '400px',
              height: '100%',
              display: 'block',
              mx: 'auto',
              filter: 'drop-shadow(0 28px 55px rgba(9,47,33,0.12))',
            }}
          />

          <Stack sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 4 }}>
            <Box sx={{ width: '50%' }}>
              <Typography
                variant="h3"
                color="primary"
                sx={{
                  fontStyle: 'italic',
                }}
              >
                ปางเธอท่านผทม เสด็จชมเสวยสวรรค์ อาภาผ่องเพ็ญจันทร์ พระเธอนั้นนิทราลัย
                เสด็จมาเป็นแก้วตา ให้ประชาได้ชื่นใจ เสด็จสู่สุราลัย ดังดวงใจจะรานรอน
              </Typography>

              <Typography
                variant="h4"
                color="primary"
                sx={{
                  fontStyle: 'italic',
                  mt: 3,
                }}
              >
                &quot;รจนาอาลัย : รัฐพล อินโพนทัน&quot;
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              mt: 3,
              mx: 'auto',
              width: 180,
              height: 4,
              bgcolor: theme.palette.secondary.main,
              opacity: 0.72,
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2.5, md: 8, lg: 13 },
          py: { xs: 7, md: 10 },
          minHeight: 800,
          backgroundImage: `
            linear-gradient(0deg, ${theme.palette.primary.main} 10%, rgba(9,47,33,0.64) 48%, ${theme.palette.secondary.main} 100%),
            linear-gradient(0deg, rgba(217,181,109,0.1), rgba(217,181,109,0.1)),
            url(${SCENES_1_IMAGE})
          `,
          backgroundSize: 'cover',
          backgroundPosition: '100% 20%',
        }}
      >
        <Box sx={{ mx: 'auto', maxWidth: 1000, textAlign: 'center' }}>
          <Typography variant="h3" color="primary">
            สมเด็จพระกนิษฐาธิราชเจ้า ฯ เชิญขวัญแม่โคสกเจ้า เข้าคืนนา
          </Typography>
          <Typography variant="subtitle1" color="primary" sx={{ mt: 1.4, textAlign: 'center' }}>
            พระเทพนารี สองมือนี้ข้าถวาย มืออันเคยกรำหนักปักกล้าทำนามิวาย ขอฟ้อนถวายพระเทพนารี
            อิตถีรัตนา ข้าหมายยิ่งว่า เทิดพระทรงศรี ขอได้สดับขับกล่อมพาที ลำนำชาวนา
            เถิดพระทูลพระหม่อม เอย พระยอดกัลยา ข้า บ่มีสิ่งสูงค่าถวาย หากบ่ควรค่าใด
            ขอทรงอภัยพระยอดกัลยา ธ แสนประเสริฐ ขอสำราญเถิด พระพุทธเจ้าข้า เหล่ากสิกรจักฟ้อนถวยพร
            ไหว้ว่า ขอพระกนิษฐา จงยศยิ่งยงทรงชัย อนตายสังอันใด อย่าได้กายใกล้ พระทูลกระหม่อม เอย
          </Typography>

          <Box
            sx={{
              mt: 7,
              display: 'grid',
              gap: { xs: 2.2, sm: 2.5 },
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {ROYAL_IMAGE_ITEMS.map((image) => (
              <Box
                key={image.src}
                className="royal-image-button"
                component="button"
                type="button"
                aria-label={`ดูภาพ ${image.title}`}
                onClick={() => setSelectedImage(image)}
                sx={{
                  p: 0,
                  m: 0,
                  border: 0,
                  width: 1,
                  display: 'block',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 1,
                  bgcolor: 'transparent',
                  position: 'relative',
                  '&::after': {
                    inset: 0,
                    opacity: 0,
                    content: '""',
                    position: 'absolute',
                    transition: 'opacity 180ms ease',
                    background:
                      'linear-gradient(180deg, rgba(5,37,24,0.02) 0%, rgba(5,37,24,0.46) 100%)',
                  },
                  '&:hover::after, &:focus-visible::after': {
                    opacity: 1,
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.secondary.main}`,
                    outlineOffset: 4,
                  },
                  '&:hover .royal-image-preview-icon, &:focus-visible .royal-image-preview-icon': {
                    opacity: 1,
                    transform: 'translate(-50%, -50%) scale(1)',
                  },
                }}
              >
                <Image
                  alt={image.title}
                  src={image.src}
                  ratio="3/4"
                  sx={{
                    width: 1,
                    transition: 'transform 220ms ease',
                    '.royal-image-button:hover > &, .royal-image-button:focus-visible > &': {
                      transform: 'scale(1.04)',
                    },
                  }}
                />
                <Box
                  className="royal-image-preview-icon"
                  sx={{
                    top: '50%',
                    left: '50%',
                    zIndex: 1,
                    width: 52,
                    height: 52,
                    opacity: 0,
                    display: 'grid',
                    borderRadius: '50%',
                    placeItems: 'center',
                    position: 'absolute',
                    color: theme.palette.secondary.main,
                    transform: 'translate(-50%, -50%) scale(0.92)',
                    transition: 'opacity 180ms ease, transform 180ms ease',
                    bgcolor: 'rgba(9, 47, 33, 0.64)',
                    border: '1px solid rgba(234,215,161,0.58)',
                    boxShadow: '0 18px 40px rgba(0,0,0,0.34)',
                  }}
                >
                  <Iconify icon="solar:eye-bold" width={24} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          px: { xs: 2.5, md: 8, lg: 13 },
          py: { xs: 8, md: 12 },
          minHeight: 670,
          backgroundImage: `
            linear-gradient(180deg, ${theme.palette.primary.main} 0%, rgba(9,47,33,0.64) 32%, ${theme.palette.primary.main} 100%),
            linear-gradient(90deg, rgba(5,37,24,0.94) 0%, rgba(18,61,43,0.48) 52%, rgba(5,37,24,0.9) 100%),
            linear-gradient(0deg, rgba(217,181,109,0.1), rgba(217,181,109,0.1)),
            url(${KRU_IMAGE})
          `,
          backgroundSize: 'cover',
          backgroundPosition: '100% 100%',
        }}
      >
        {/* <Stack sx={{ display: 'flex', textAlign: 'center', mb: 2 }}>
          <Typography variant="h3">ธีรวัฒน์ เจียงคำ</Typography>
        </Stack> */}
        <Box
          sx={{
            mx: 'auto',
            gap: { xs: 6, md: 5 },
            maxWidth: 1280,
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: '1fr', md: '0.88fr 1.12fr' },
          }}
        >
          <Box
            sx={{
              gap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: 'rgba(234,215,161,0.1)',
                border: '1px solid rgba(234,215,161,0.22)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
              }}
            >
              <Box
                sx={{
                  width: 1,
                  aspectRatio: '16 / 9',
                  height: { xs: 200, md: 350 },
                  overflow: 'hidden',
                  borderRadius: 1,
                  bgcolor: '#052518',
                  '& .react-player__preview': {
                    borderRadius: 1,
                  },
                  '& .react-player__shadow': {
                    bgcolor: 'rgba(9, 47, 33, 0.54)',
                    boxShadow: '0 18px 40px rgba(0,0,0,0.34)',
                  },
                }}
              >
                <ReactPlayer
                  src="https://www.youtube.com/watch?v=76jSHW8-Sug&t=5s"
                  light="https://img.youtube.com/vi/76jSHW8-Sug/maxresdefault.jpg"
                  width="100%"
                  height="100%"
                  playIcon={<PlayButton small />}
                  // previewAriaLabel={`ดูวิดีโอ ${video.title}`}
                  // onClickPreview={() => setSelectedVideo(video)}
                />
              </Box>
            </Box>
          </Box>

          <Box>
            <Typography
              component="h2"
              sx={{
                color: theme.palette.secondary.main,
                maxWidth: 520,
                fontSize: { xs: 42, sm: 58, md: 68 },
                fontWeight: 800,
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}
            >
              ธีรวัฒน์ เจียงคำ
            </Typography>

            <Typography
              sx={{
                mt: 4,
                maxWidth: 430,
                color: theme.palette.secondary.main,
                lineHeight: 1.75,
              }}
            >
              การออกแบบไม่ควรยึดติดกับรูปแบบเดิมจนเกินไป
              จนไม่สัมพันธ์กับความต้องการใช้งานของคนรุ่นใหม่
              แนวคิดที่ดีคือการปล่อยให้วัสดุมีความเป็นตัวของมันเองมากที่สุด
              เพื่อให้สามารถปรับเปลี่ยนไปเป็นอะไรก็ได้ที่ตอบสนองการใช้งานและสภาพปัจจุบันของผู้ใช้
              ถ้าเรายึดติดกับการทำให้สิ่งของมีลักษณะโบราณมากเกินไป มันก็จะอยู่ได้แค่ในพิพิธภัณฑ์
              ไม่ได้ถูกนำไปใช้งานจริง เมื่อสิ่งของไม่ถูกนำไปใช้งาน มันก็ไม่สามารถอยู่ร่วมกับสังคมได้
            </Typography>

            <Typography
              variant="h4"
              sx={{
                fontStyle: 'italic',
                mt: 3,
              }}
            >
              &quot;ธีรวัฒน์ เจียงคำ&quot;
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontStyle: 'italic',
                mt: 3,
              }}
            >
              ที่มา https://soundisan.com/news/ttaste-khamriang/ และ The Isaan Record Podcast
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2.5, md: 8, lg: 13 },
          py: { xs: 8, md: 12 },
          minHeight: 800,
          backgroundImage: `
            linear-gradient(180deg, ${theme.palette.primary.main} 0%, rgba(9,47,33,0.64) 32%, ${theme.palette.primary.main} 100%),
            linear-gradient(90deg, rgba(5,37,24,0.94) 0%, rgba(18,61,43,0.48) 52%, rgba(5,37,24,0.9) 100%),
            linear-gradient(0deg, rgba(217,181,109,0.1), rgba(217,181,109,0.1)),
            url(${SCENES_IMAGE})
          `,
          backgroundSize: 'cover',
          backgroundPosition: '100% 100%',
        }}
      >
        <Box
          sx={{
            mx: 'auto',
            gap: { xs: 6, md: 5 },
            maxWidth: 1280,
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: '1fr', md: '0.88fr 1.12fr' },
          }}
        >
          <Box>
            <Typography
              component="h2"
              sx={{
                color: theme.palette.secondary.main,
                maxWidth: 520,
                fontSize: { xs: 42, sm: 58, md: 68 },
                fontWeight: 800,
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}
            >
              ศิลปะ ส่องทาง ให้แก่กัน เสมอ
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 4.5 }}>
              <PlayButton small />
              <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                รับชมวิดีโอ
              </Typography>
            </Stack>

            <Typography
              sx={{
                mt: 4,
                maxWidth: 430,
                color: theme.palette.secondary.main,
                fontSize: 13,
                lineHeight: 1.75,
              }}
            >
              อันว่า การใดแท้ ธรรมดาดีชอบ ฝูงข้าตกแต่งถ้วน อันล้วนที่ควร คุส่วนสมเสมอหน้า
              เป็นไปในโลก ผลาผลแผ่ก้วง กวมพื้นแผ่นไตร ค้อมว่าสาธุการไหว้ แล้วนบนิ้วยอลง
              กราบหว่างบูฮมฮอย บ่อนมรคาเพียงฮาบ การอันสมกระบวนเบื้อง ทั้งผองปองประโยชน์
              ตางให้โลกเล่าเฮื้องภายซ้อยซาเซ็ง
            </Typography>
          </Box>

          <Box
            sx={{
              gap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            {VIDEO_ITEMS.map((video, index) => (
              <Box
                key={`${video.title}-${index}`}
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(234,215,161,0.1)',
                  border: '1px solid rgba(234,215,161,0.22)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
                }}
              >
                <Box
                  sx={{
                    width: 1,
                    aspectRatio: '16 / 9',
                    overflow: 'hidden',
                    borderRadius: 1,
                    bgcolor: '#052518',
                    '& .react-player__preview': {
                      borderRadius: 1,
                    },
                    '& .react-player__shadow': {
                      bgcolor: 'rgba(9, 47, 33, 0.54)',
                      boxShadow: '0 18px 40px rgba(0,0,0,0.34)',
                    },
                  }}
                >
                  <ReactPlayer
                    key={`${video.title}-${videoPreviewKey}`}
                    src={video.src}
                    light={video.cover}
                    width="100%"
                    height="100%"
                    playIcon={<PlayButton small />}
                    previewAriaLabel={`ดูวิดีโอ ${video.title}`}
                    onClickPreview={() => setSelectedVideo(video)}
                  />
                </Box>

                <Typography
                  sx={{
                    mt: 1.25,
                    px: 0.5,
                    color: theme.palette.secondary.main,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {video.title}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* <Box
        sx={{
          textAlign: 'center',
          px: { xs: 2.5, md: 8, lg: 13 },
          py: { xs: 8, md: 12 },
          minHeight: 600,
          backgroundImage: `
            linear-gradient(180deg, ${theme.palette.primary.main} 0%, rgba(9,47,33,0.64) 32%, ${theme.palette.primary.main} 100%),
            linear-gradient(90deg, rgba(5,37,24,0.94) 0%, rgba(18,61,43,0.48) 52%, rgba(5,37,24,0.9) 100%),
            linear-gradient(0deg, rgba(217,181,109,0.1), rgba(217,181,109,0.1)),
            url(${SCENES_IMAGE})
          `,
          backgroundSize: 'cover',
          backgroundPosition: '100% 100%',
        }}
      >
        <Typography
          sx={{
            mt: 2,
            color: theme.palette.secondary.main,
            fontSize: { xs: 24, sm: 32, md: 40 },
            fontWeight: 800,
            lineHeight: 0.92,
            textTransform: 'uppercase',
          }}
        >
          ผู้มีส่วนร่วม
        </Typography>
        <Stack
          mt={6}
          sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}
          spacing={4}
        >
          <Image alt="Single logo" sx={{ width: 200 }} src="/assets/akhahas-sri/logo-kaitod.png" />
        </Stack>
      </Box> */}

      <Dialog
        fullWidth
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        slotProps={{
          paper: {
            sx: {
              overflow: 'hidden',
              bgcolor: theme.palette.primary.main,
              borderRadius: 1.5,
              border: '1px solid rgba(234,215,161,0.24)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.25,
            gap: 1.5,
            display: 'flex',
            alignItems: 'center',
            color: theme.palette.secondary.main,
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{selectedImage?.title}</Typography>

          <IconButton onClick={() => setSelectedImage(null)} sx={{ color: 'inherit' }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>

        <DialogContent sx={{ py: 3, bgcolor: theme.palette.primary.main, width: 'auto' }}>
          {selectedImage && (
            <Box
              component="img"
              alt={selectedImage.title}
              src={selectedImage.src}
              sx={{
                width: 1,
                height: 'auto',
                display: 'block',
                objectFit: 'contain',
                maxHeight: { xs: '78vh', md: '82vh' },
                bgcolor: theme.palette.primary.main,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="lg"
        open={!!selectedVideo}
        onClose={handleCloseVideo}
        slotProps={{
          paper: {
            sx: {
              overflow: 'hidden',
              bgcolor: '#052518',
              borderRadius: 1.5,
              border: '1px solid rgba(234,215,161,0.24)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.25,
            gap: 1.5,
            display: 'flex',
            alignItems: 'center',
            color: theme.palette.secondary.main,
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{selectedVideo?.title}</Typography>

          <IconButton onClick={handleCloseVideo} sx={{ color: 'inherit' }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          <Box sx={{ width: 1, aspectRatio: '16 / 9' }}>
            {selectedVideo && (
              <ReactPlayer controls playing src={selectedVideo.src} width="100%" height="100%" />
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* <Stack
        component="footer"
        direction="row"
        spacing={4}
        justifyContent="center"
        sx={{ pb: 7, color: theme.palette.secondary.main, bgcolor: theme.palette.primary.main }}
      >
        {_socials.map((social) => (
          <IconButton key={social.label}>
            {social.value === 'twitter' && <Iconify icon="socials:twitter" />}
            {social.value === 'facebook' && <Iconify icon="socials:facebook" />}
            {social.value === 'instagram' && <Iconify icon="socials:instagram" />}
            {social.value === 'linkedin' && <Iconify icon="socials:linkedin" />}
          </IconButton>
        ))}
      </Stack> */}
    </Box>
  );
}
